"""
app/routers/jobs.py
────────────────────
GET /api/v1/jobs/{job_id} — poll async batch job status and results
"""
from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.db.models import BatchJob, ScreeningResult as ScreeningResultModel
from app.dependencies import DBSession
from app.schemas.jobs import (
    JobDetailResponse,
    JobResultSummary,
    JobStatus,
    LabelSummary,
)

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get(
    "/jobs/{job_id}",
    response_model=JobDetailResponse,
    summary="Get batch job status and results",
    description="""
Poll the status of an async batch screening job submitted via `POST /screen/batch`.

**Polling strategy:**
- While `status == "pending"` or `"processing"`: poll every 2–5 seconds
- When `status == "completed"` or `"failed"`: stop polling

**Result retrieval:**
When completed, `result_ids` contains the UUIDs of all `ScreeningResult` records.
Query `GET /history` with `job_id` filter to retrieve detailed per-signal results.
    """,
    responses={
        200: {"description": "Job status and progress"},
        404: {"description": "Job not found"},
    },
)
async def get_job(
    job_id: uuid.UUID,
    db: DBSession,
) -> JobDetailResponse:
    from app.services.job_service import job_service

    # 1. Check in-memory JobService first (works in standalone demo mode)
    in_memory = job_service.get_job(job_id)
    if in_memory is not None:
        return in_memory

    # 2. Check PostgreSQL database if available
    job = None
    if db is not None:
        try:
            stmt = select(BatchJob).where(BatchJob.id == job_id)
            result = await db.execute(stmt)
            job = result.scalar_one_or_none()
        except Exception as exc:
            logger.warning("Error querying batch job from database", error=str(exc))

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Job not found", "details": [{"code": "job_not_found", "message": f"No job with ID {job_id}"}]},
        )

    # Fetch result IDs if job is completed
    result_ids: list[uuid.UUID] | None = None
    if job.status == "completed":
        id_result = await db.execute(
            select(ScreeningResultModel.id)
            .where(ScreeningResultModel.batch_job_id == job_id)
            .order_by(ScreeningResultModel.created_at)
        )
        result_ids = [row[0] for row in id_result.fetchall()]

    # Build result summary schema
    result_summary = None
    if job.result_summary is not None:
        rs = job.result_summary
        lc = rs.get("label_counts", {})
        result_summary = JobResultSummary(
            total_beats=rs.get("total_beats", 0),
            label_counts=LabelSummary(
                N=lc.get("N", 0),
                S=lc.get("S", 0),
                V=lc.get("V", 0),
                F=lc.get("F", 0),
                Q=lc.get("Q", 0),
            ),
            abnormal_beat_rate=rs.get("abnormal_beat_rate", 0.0),
            signals_with_abnormal_beats=rs.get("signals_with_abnormal_beats", 0),
            failed_signals=rs.get("failed_signals", 0),
        )

    return JobDetailResponse(
        job_id=job.id,
        status=JobStatus(job.status),
        total_signals=job.total_signals,
        processed_signals=job.processed_signals,
        failed_signals=job.failed_signals,
        progress_pct=job.progress_pct,
        error_message=job.error_message,
        result_summary=result_summary,
        result_ids=result_ids,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
    )
