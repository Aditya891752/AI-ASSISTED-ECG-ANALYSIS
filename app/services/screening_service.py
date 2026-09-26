"""
app/services/screening_service.py
──────────────────────────────────
Core orchestration layer for single-shot ECG screening.

Flow:
  1. Check Redis cache (skip full pipeline if signal was seen recently)
  2. Run preprocessing in a thread-pool executor (CPU-bound)
  3. Run batched model inference in a thread-pool executor
  4. Persist result to PostgreSQL
  5. Cache result in Redis
  6. Return schema-typed result
"""
from __future__ import annotations

import asyncio
import time
import uuid
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ScreeningResult as ScreeningResultModel
from app.schemas.ecg import (
    AAMILabel,
    BeatClassification,
    ScreeningRequest,
    ScreeningResult,
    SignalRecord,
)
from app.services import cache_service
from app.services.model_service import ModelService
from app.services.preprocessing import preprocess_ecg
from app.utils.metrics import (
    ABNORMAL_BEATS,
    BEATS_CLASSIFIED,
    PREPROCESSING_LATENCY,
)

logger = structlog.get_logger(__name__)

_PREPROCESS_EXECUTOR = ThreadPoolExecutor(
    max_workers=4,
    thread_name_prefix="ecg-preproc",
)


async def screen_single(
    request: ScreeningRequest,
    model_service: ModelService,
    db: AsyncSession,
) -> ScreeningResult:
    """
    Screen a single ECG signal end-to-end.
    Returns a fully validated ScreeningResult schema.
    """
    signal_array = np.array(request.signal, dtype=np.float64)
    signal_hash = cache_service.hash_signal(request.signal)

    # ── 1. Cache lookup ────────────────────────────────────────────────────────
    if cached := await cache_service.get_cached_result(signal_hash):
        logger.debug("Cache hit for signal", hash=signal_hash)
        return ScreeningResult(**cached)

    # ── 2. Preprocessing (thread-pool) ────────────────────────────────────────
    t0 = time.perf_counter()
    loop = asyncio.get_running_loop()
    filtered, r_peaks, feature_matrix = await loop.run_in_executor(
        _PREPROCESS_EXECUTOR,
        preprocess_ecg,
        signal_array,
        request.sample_rate,
    )
    preprocessing_ms = (time.perf_counter() - t0) * 1000
    PREPROCESSING_LATENCY.observe(preprocessing_ms / 1000)

    if feature_matrix.shape[0] == 0:
        # No beats detected — return empty result
        return _build_result(
            request=request,
            r_peaks=np.array([], dtype=np.int64),
            labels=[],
            confidences=[],
            proba_dicts=[],
            preprocessing_ms=preprocessing_ms,
            inference_ms=0.0,
            db=db,
            persist=False,
        )

    # ── 3. Batched inference ───────────────────────────────────────────────────
    t1 = time.perf_counter()
    labels, confidences, proba_dicts = await model_service.predict(feature_matrix)
    inference_ms = (time.perf_counter() - t1) * 1000

    # ── 4. Metrics ────────────────────────────────────────────────────────────
    for label in labels:
        BEATS_CLASSIFIED.labels(label=label).inc()
        if label != "N":
            ABNORMAL_BEATS.labels(label=label).inc()

    # ── 5. Persist + cache ────────────────────────────────────────────────────
    result = await _build_result(
        request=request,
        r_peaks=r_peaks,
        labels=labels,
        confidences=confidences,
        proba_dicts=proba_dicts,
        preprocessing_ms=preprocessing_ms,
        inference_ms=inference_ms,
        db=db,
        persist=True,
    )

    await cache_service.cache_result(signal_hash, result.model_dump(mode="json"))
    return result


async def screen_signal_record(
    record: SignalRecord,
    model_service: ModelService,
    db: AsyncSession,
    batch_job_id: str | None = None,
) -> ScreeningResult:
    """Adapter used by the Celery batch task — wraps SignalRecord into a ScreeningRequest."""
    req = ScreeningRequest(
        signal=record.signal,
        sample_rate=record.sample_rate,
        patient_id=record.patient_id,
        signal_id=record.signal_id,
    )
    return await screen_single(req, model_service, db)


async def _build_result(
    *,
    request: ScreeningRequest,
    r_peaks: np.ndarray,
    labels: list[str],
    confidences: list[float],
    proba_dicts: list[dict[str, float]],
    preprocessing_ms: float,
    inference_ms: float,
    db: AsyncSession,
    persist: bool,
) -> ScreeningResult:
    """Assemble the result schema and optionally persist to DB."""
    signal_id = request.signal_id or str(uuid.uuid4())
    result_id = uuid.uuid4()
    n_beats = len(labels)

    beats = [
        BeatClassification(
            beat_index=i,
            r_peak_sample=int(r_peaks[i]),
            r_peak_time_s=round(int(r_peaks[i]) / request.sample_rate, 4),
            label=AAMILabel(labels[i]),
            confidence=round(confidences[i], 4),
            probabilities={k: round(v, 4) for k, v in proba_dicts[i].items()},
        )
        for i in range(n_beats)
    ]

    label_counts = Counter(labels)
    label_summary = {lbl: label_counts.get(lbl, 0) for lbl in ["N", "S", "V", "F", "Q"]}
    dominant_label = max(label_summary, key=label_summary.get) if labels else None  # type: ignore[arg-type]

    import datetime
    created_at = datetime.datetime.now(datetime.timezone.utc)

    if persist and db is not None:
        try:
            orm = ScreeningResultModel(
                id=result_id,
                patient_id=request.patient_id,
                signal_id=signal_id,
                beats=[b.model_dump(mode="json") for b in beats],
                total_beats=n_beats,
                dominant_label=dominant_label,
                count_n=label_summary["N"],
                count_s=label_summary["S"],
                count_v=label_summary["V"],
                count_f=label_summary["F"],
                count_q=label_summary["Q"],
                sample_rate=request.sample_rate,
                signal_length=len(request.signal),
                preprocessing_duration_ms=preprocessing_ms,
                inference_duration_ms=inference_ms,
                created_at=created_at,
            )
            db.add(orm)
            await db.flush()  # get the ID without committing yet
            logger.info(
                "Screening result persisted",
                result_id=str(result_id),
                patient_id=request.patient_id,
                total_beats=n_beats,
            )
        except Exception as exc:  # noqa: BLE001
            logger.debug("Database persistence skipped (running in demo mode)", error=str(exc))

    res = ScreeningResult(
        result_id=result_id,
        signal_id=signal_id,
        patient_id=request.patient_id,
        sample_rate=request.sample_rate,
        signal_length_samples=len(request.signal),
        total_beats=n_beats,
        beats=beats,
        dominant_label=AAMILabel(dominant_label) if dominant_label else None,
        label_summary=label_summary,
        preprocessing_duration_ms=round(preprocessing_ms, 2),
        inference_duration_ms=round(inference_ms, 2),
        created_at=created_at.isoformat(),
    )

    try:
        from app.services.history_service import history_service
        history_service.add(res)
    except Exception as exc:
        logger.debug("Failed to record result to history_service", error=str(exc))

    return res
