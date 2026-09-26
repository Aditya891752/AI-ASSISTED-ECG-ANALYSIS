"""
app/services/job_service.py
───────────────────────────
In-memory batch job manager with support for in-process BackgroundTasks execution
and fallback from Celery. Ensures batch processing works in both standalone demo
mode and full production mode.
"""
from __future__ import annotations

import asyncio
import datetime
import uuid
from collections import Counter
from typing import Any

import numpy as np
import structlog

from app.config import get_settings
from app.schemas.jobs import (
    JobDetailResponse,
    JobResponse,
    JobResultSummary,
    JobStatus,
    LabelSummary,
)
from app.services.model_service import ModelService
from app.services.preprocessing import preprocess_ecg

logger = structlog.get_logger(__name__)
settings = get_settings()


class JobService:
    def __init__(self) -> None:
        self._jobs: dict[uuid.UUID, dict[str, Any]] = {}

    def create_job(self, total_signals: int) -> tuple[uuid.UUID, JobResponse]:
        job_id = uuid.uuid4()
        now = datetime.datetime.now(datetime.timezone.utc)
        self._jobs[job_id] = {
            "job_id": job_id,
            "status": JobStatus.PENDING,
            "total_signals": total_signals,
            "processed_signals": 0,
            "failed_signals": 0,
            "progress_pct": 0.0,
            "error_message": None,
            "result_summary": None,
            "result_ids": [],
            "created_at": now,
            "started_at": None,
            "completed_at": None,
        }
        response = JobResponse(
            job_id=job_id,
            status=JobStatus.PENDING,
            total_signals=total_signals,
            message="Job queued for processing",
            poll_url=f"{settings.api_prefix}/jobs/{job_id}",
        )
        return job_id, response

    def get_job(self, job_id: uuid.UUID) -> JobDetailResponse | None:
        job = self._jobs.get(job_id)
        if job is None:
            return None
        return JobDetailResponse(**job)

    async def run_batch_in_background(
        self,
        job_id: uuid.UUID,
        signals_data: list[dict[str, Any]],
        model_service: ModelService,
    ) -> None:
        """Process signals sequentially/chunked in the background event loop."""
        job = self._jobs.get(job_id)
        if not job:
            return

        job["status"] = JobStatus.PROCESSING
        job["started_at"] = datetime.datetime.now(datetime.timezone.utc)
        logger.info("Started in-process batch job execution", job_id=str(job_id), total=len(signals_data))

        label_counter: Counter[str] = Counter()
        signals_with_abnormal = 0
        failed_count = 0
        processed_count = 0

        for i, s_data in enumerate(signals_data):
            try:
                raw_sig = np.array(s_data["signal"], dtype=np.float64)
                fs = s_data.get("sample_rate", 360)

                if len(raw_sig) < 360 or np.any(np.isnan(raw_sig)):
                    failed_count += 1
                else:
                    _, r_peaks, feature_matrix = preprocess_ecg(raw_sig, fs)
                    if feature_matrix.shape[0] > 0:
                        labels, confs, probas = await model_service.predict(feature_matrix)
                        label_counter.update(labels)
                        if any(lbl in ("S", "V", "F", "Q", "ABNORMAL") for lbl in labels):
                            signals_with_abnormal += 1
            except Exception as exc:
                logger.warning("Error processing signal in batch", index=i, error=str(exc))
                failed_count += 1
            finally:
                processed_count += 1
                job["processed_signals"] = processed_count
                job["failed_signals"] = failed_count
                job["progress_pct"] = round((processed_count / len(signals_data)) * 100, 1)

            # Small async yield to allow polling requests to be handled promptly
            await asyncio.sleep(0.02)

        total_valid_beats = sum(label_counter.values())
        normal_beats = label_counter.get("N", 0)
        abnormal_beats = total_valid_beats - normal_beats
        abnormal_rate = (abnormal_beats / total_valid_beats) if total_valid_beats > 0 else 0.0

        label_counts = LabelSummary(
            N=label_counter.get("N", 0),
            S=label_counter.get("S", 0),
            V=label_counter.get("V", 0),
            F=label_counter.get("F", 0),
            Q=label_counter.get("Q", 0),
        )

        job["status"] = JobStatus.COMPLETED
        job["completed_at"] = datetime.datetime.now(datetime.timezone.utc)
        job["result_summary"] = JobResultSummary(
            total_beats=total_valid_beats,
            label_counts=label_counts,
            abnormal_beat_rate=round(abnormal_rate, 4),
            signals_with_abnormal_beats=signals_with_abnormal,
            failed_signals=failed_count,
        )
        logger.info(
            "In-process batch job completed",
            job_id=str(job_id),
            total_beats=total_valid_beats,
            abnormal_rate=abnormal_rate,
        )


job_service = JobService()
