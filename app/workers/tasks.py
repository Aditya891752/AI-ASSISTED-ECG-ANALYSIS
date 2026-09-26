"""
app/workers/tasks.py
────────────────────
Celery tasks for async batch ECG processing.

Design notes:
  • The task receives raw signal data (JSON-serialisable) — no shared memory.
  • Preprocessing and inference are chunked into `ECG_BATCH_SIZE` to prevent
    OOM on large batches and enable incremental DB writes.
  • Progress is written to both the DB row and Redis so GET /jobs/{id} can
    serve low-latency progress updates without a DB round-trip.
  • On failure the job is marked 'failed' with a human-readable error message.
"""
from __future__ import annotations

import asyncio
import datetime
import uuid
from collections import Counter
from typing import Any

import numpy as np
import structlog
from celery import Task
from celery.exceptions import SoftTimeLimitExceeded

from app.config import get_settings
from app.db.database import AsyncSessionLocal
from app.db.models import BatchJob, ScreeningResult as ScreeningResultModel
from app.schemas.ecg import SignalRecord
from app.services import cache_service
from app.services.model_service import ModelService
from app.services.preprocessing import preprocess_ecg
from app.utils.metrics import (
    ABNORMAL_BEATS,
    BATCH_JOBS_COMPLETED,
    BATCH_JOBS_FAILED,
    BATCH_QUEUE_DEPTH,
    BEATS_CLASSIFIED,
)
from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)
settings = get_settings()

# Each worker process holds one model instance loaded lazily on first task.
_worker_model: ModelService | None = None


def _get_worker_model() -> ModelService:
    global _worker_model
    if _worker_model is None:
        _worker_model = ModelService(model_path=settings.model_path)
        asyncio.get_event_loop().run_until_complete(_worker_model.load())
        logger.info("Worker model loaded", path=settings.model_path)
    return _worker_model


@celery_app.task(
    bind=True,
    name="app.workers.tasks.process_batch_task",
    queue="batch",
    max_retries=3,
    default_retry_delay=30,
    soft_time_limit=settings.celery_task_soft_time_limit,
    time_limit=settings.celery_task_time_limit,
)
def process_batch_task(
    self: Task,
    job_id: str,
    signals_data: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Process a batch of ECG signals asynchronously.

    Parameters
    ----------
    job_id       : str   — UUID of the BatchJob row in PostgreSQL
    signals_data : list  — serialised SignalRecord dicts

    Returns
    -------
    Summary dict (also stored in BatchJob.result_summary).
    """
    BATCH_QUEUE_DEPTH.dec()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(
            _process_batch_async(self, job_id, signals_data)
        )
    finally:
        loop.close()


async def _process_batch_async(
    task: Task,
    job_id: str,
    signals_data: list[dict[str, Any]],
) -> dict[str, Any]:
    model = _get_worker_model()
    batch_size = settings.ecg_batch_size
    total = len(signals_data)
    processed = 0
    failed = 0
    all_label_counts: Counter = Counter()
    result_ids: list[str] = []
    signals_with_abnormal = 0

    async with AsyncSessionLocal() as db:
        # ── Mark job as processing ─────────────────────────────────────────────
        from sqlalchemy import select, update
        await db.execute(
            update(BatchJob)
            .where(BatchJob.id == uuid.UUID(job_id))
            .values(
                status="processing",
                started_at=datetime.datetime.now(datetime.timezone.utc),
                celery_task_id=task.request.id,
            )
        )
        await db.commit()

        # ── Process in sub-batches ─────────────────────────────────────────────
        for chunk_start in range(0, total, batch_size):
            chunk = signals_data[chunk_start: chunk_start + batch_size]

            try:
                chunk_result_ids, chunk_label_counts, chunk_abnormal = (
                    await _process_chunk(chunk, model, db, job_id)
                )
                result_ids.extend(chunk_result_ids)
                all_label_counts.update(chunk_label_counts)
                signals_with_abnormal += chunk_abnormal
                processed += len(chunk)
            except SoftTimeLimitExceeded:
                logger.warning("Soft time limit exceeded — aborting batch", job_id=job_id)
                failed += len(chunk)
                break
            except Exception as exc:  # noqa: BLE001
                logger.error("Chunk processing error", job_id=job_id, exc_info=exc)
                failed += len(chunk)

            # Update progress in Redis (fast) and DB (periodic)
            await cache_service.set_job_progress(job_id, processed, total)
            if processed % (batch_size * 5) == 0 or processed == total:
                await db.execute(
                    update(BatchJob)
                    .where(BatchJob.id == uuid.UUID(job_id))
                    .values(processed_signals=processed, failed_signals=failed)
                )
                await db.commit()

        # ── Build summary ──────────────────────────────────────────────────────
        total_beats = sum(all_label_counts.values())
        abnormal_beats = sum(
            all_label_counts.get(lbl, 0) for lbl in ["S", "V", "F", "Q"]
        )
        summary = {
            "total_beats": total_beats,
            "label_counts": {
                "N": all_label_counts.get("N", 0),
                "S": all_label_counts.get("S", 0),
                "V": all_label_counts.get("V", 0),
                "F": all_label_counts.get("F", 0),
                "Q": all_label_counts.get("Q", 0),
            },
            "abnormal_beat_rate": (
                round(abnormal_beats / total_beats, 4) if total_beats > 0 else 0.0
            ),
            "signals_with_abnormal_beats": signals_with_abnormal,
            "failed_signals": failed,
        }

        # ── Mark job completed ─────────────────────────────────────────────────
        await db.execute(
            update(BatchJob)
            .where(BatchJob.id == uuid.UUID(job_id))
            .values(
                status="completed" if failed < total else "failed",
                processed_signals=processed,
                failed_signals=failed,
                completed_at=datetime.datetime.now(datetime.timezone.utc),
                result_summary=summary,
            )
        )
        await db.commit()

    BATCH_JOBS_COMPLETED.inc()
    logger.info(
        "Batch job complete",
        job_id=job_id,
        total=total,
        processed=processed,
        failed=failed,
    )
    return summary


async def _process_chunk(
    chunk: list[dict[str, Any]],
    model: ModelService,
    db,
    job_id: str,
) -> tuple[list[str], Counter, int]:
    """
    Preprocess + infer + persist a sub-batch of signals.
    Returns (result_ids, label_counter, n_signals_with_abnormal_beats).
    """
    result_ids: list[str] = []
    label_counter: Counter = Counter()
    signals_with_abnormal = 0

    # Gather feature matrices for the whole chunk before calling model
    # (maximise batch size → better GPU/CPU utilisation)
    preprocessed = []
    for record_data in chunk:
        try:
            signal_arr = np.array(record_data["signal"], dtype=np.float64)
            fs = record_data.get("sample_rate", 360)
            filtered, r_peaks, features = preprocess_ecg(signal_arr, fs)
            preprocessed.append((record_data, r_peaks, features, fs))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Preprocessing failed for signal", exc_info=exc)
            preprocessed.append(None)

    # Concatenate all feature matrices for a single inference call
    valid_indices = [i for i, p in enumerate(preprocessed) if p is not None and p[2].shape[0] > 0]
    if valid_indices:
        stacked = np.vstack([preprocessed[i][2] for i in valid_indices])  # type: ignore[index]
        labels_all, confs_all, probas_all = await model.predict(stacked)

        # Split results back per signal
        offset = 0
        for i in valid_indices:
            rd, r_peaks, features, fs = preprocessed[i]  # type: ignore[misc]
            n = features.shape[0]
            labels = labels_all[offset: offset + n]
            confs = confs_all[offset: offset + n]
            probas = probas_all[offset: offset + n]
            offset += n

            result_id = uuid.uuid4()
            signal_id = rd.get("signal_id") or str(uuid.uuid4())
            lc = Counter(labels)
            label_counter.update(lc)

            for lbl in labels:
                BEATS_CLASSIFIED.labels(label=lbl).inc()
                if lbl != "N":
                    ABNORMAL_BEATS.labels(label=lbl).inc()

            has_abnormal = any(lbl != "N" for lbl in labels)
            if has_abnormal:
                signals_with_abnormal += 1

            dominant = max(lc, key=lc.get) if lc else None  # type: ignore[arg-type]
            beats_json = [
                {
                    "beat_index": bi,
                    "r_peak_sample": int(r_peaks[bi]),
                    "r_peak_time_s": round(int(r_peaks[bi]) / fs, 4),
                    "label": labels[bi],
                    "confidence": round(confs[bi], 4),
                    "probabilities": {k: round(v, 4) for k, v in probas[bi].items()},
                }
                for bi in range(n)
            ]

            orm = ScreeningResultModel(
                id=result_id,
                patient_id=rd.get("patient_id"),
                signal_id=signal_id,
                beats=beats_json,
                total_beats=n,
                dominant_label=dominant,
                count_n=lc.get("N", 0),
                count_s=lc.get("S", 0),
                count_v=lc.get("V", 0),
                count_f=lc.get("F", 0),
                count_q=lc.get("Q", 0),
                sample_rate=fs,
                signal_length=len(rd["signal"]),
                batch_job_id=uuid.UUID(job_id),
                created_at=datetime.datetime.now(datetime.timezone.utc),
            )
            db.add(orm)
            result_ids.append(str(result_id))

    await db.flush()
    return result_ids, label_counter, signals_with_abnormal
