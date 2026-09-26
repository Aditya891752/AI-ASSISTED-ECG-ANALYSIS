"""
app/routers/screening.py
─────────────────────────
POST /api/v1/screen        — single ECG signal screening
POST /api/v1/screen/batch  — async batch screening (returns job ID)
"""
from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, UploadFile, File, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings
from app.dependencies import DBSession, ModelDep
from app.schemas.ecg import (
    BatchScreeningRequest,
    ScreeningRequest,
    ScreeningResult,
    SignalRecord,
)
from app.schemas.jobs import JobResponse
from app.services.screening_service import screen_single
from app.utils.metrics import BATCH_JOBS_SUBMITTED, BATCH_QUEUE_DEPTH

router = APIRouter()
logger = structlog.get_logger(__name__)
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/screen",
    response_model=ScreeningResult,
    status_code=status.HTTP_200_OK,
    summary="Screen a single ECG signal",
    description="""
Submit a raw ECG signal for immediate analysis.

**Processing pipeline:**
1. Bandpass filter (0.5–40 Hz Butterworth, zero-phase)
2. Pan-Tompkins R-peak detection
3. Per-beat feature extraction
4. Batched AAMI classifier inference
5. Result persisted to TimescaleDB + cached in Redis

**Rate limit:** 60 requests/minute per IP address.

**Caching:** Identical signals (SHA-256 matched) return cached results instantly.
    """,
    responses={
        200: {"description": "Classification results for all detected beats"},
        422: {"description": "Invalid signal — NaN/Inf values, too short, wrong format"},
        503: {"description": "ML model not loaded — check model/ directory"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(settings.rate_limit_screen)
async def screen_ecg(
    request: Request,
    body: ScreeningRequest,
    model_service: ModelDep,
    db: DBSession,
) -> ScreeningResult:
    # Enforce upload size limit
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Request body exceeds maximum size of {settings.max_upload_size_mb} MB",
        )

    logger.info(
        "Screening request received",
        signal_length=len(body.signal),
        sample_rate=body.sample_rate,
        patient_id=body.patient_id,
    )

    result = await screen_single(body, model_service, db)

    logger.info(
        "Screening complete",
        result_id=str(result.result_id),
        total_beats=result.total_beats,
        dominant_label=result.dominant_label,
    )
    return result


@router.post(
    "/screen/batch",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a batch of ECG signals for async processing",
    description="""
Submit up to **5,000 ECG signals** for asynchronous processing.

Returns a `job_id` immediately (HTTP 202 Accepted).
Use `GET /jobs/{job_id}` to poll processing progress and retrieve results.

**Rate limit:** 10 requests/minute per IP address.

**Processing:**
- Signals are enqueued to a dedicated Celery worker pool
- Workers process signals in vectorized batches of `ECG_BATCH_SIZE` (default 256)
- Results are progressively written to TimescaleDB as each sub-batch completes
- Failed individual signals are counted but do not abort the overall job
    """,
    responses={
        202: {"description": "Job accepted — poll /jobs/{job_id} for status"},
        422: {"description": "Invalid request body"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(settings.rate_limit_batch)
async def screen_batch(
    request: Request,
    body: BatchScreeningRequest,
    model_service: ModelDep,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> JobResponse:
    from app.services.job_service import job_service

    # Serialise signals for processing
    signals_data = [s.model_dump(mode="json") for s in body.signals]

    # Create job in JobService (in-memory tracking)
    job_id, job_response = job_service.create_job(len(body.signals))

    # Try creating DB record if database is available
    if db is not None:
        try:
            from app.db.models import BatchJob
            job = BatchJob(
                id=job_id,
                total_signals=len(body.signals),
                status="pending",
            )
            db.add(job)
            await db.flush()
        except Exception as exc:
            logger.debug("Database record creation skipped for batch", error=str(exc))

    logger.info(
        "Batch job created",
        job_id=str(job_id),
        total_signals=len(body.signals),
    )

    # Check if Redis and Celery are available; otherwise use in-process background execution
    from app.services.cache_service import is_redis_available

    celery_dispatched = False
    if await is_redis_available():
        try:
            from app.workers.tasks import process_batch_task
            process_batch_task.apply_async(
                kwargs={"job_id": str(job_id), "signals_data": signals_data},
                task_id=str(uuid.uuid4()),
            )
            celery_dispatched = True
            logger.info("Batch job dispatched to Celery", job_id=str(job_id))
        except Exception as exc:
            logger.info("Celery dispatch failed", reason=str(exc))

    if not celery_dispatched:
        logger.info("Running batch processing in-process with BackgroundTasks", job_id=str(job_id))
        background_tasks.add_task(
            job_service.run_batch_in_background,
            job_id,
            signals_data,
            model_service,
        )

    BATCH_JOBS_SUBMITTED.inc()
    BATCH_QUEUE_DEPTH.inc()

    return job_response
