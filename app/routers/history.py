"""
app/routers/history.py
───────────────────────
GET /api/v1/history — paginated, filterable screening result history

Supported filters:
  • label           — AAMI label (N|S|V|F|Q) — filters on dominant_label
  • patient_id      — exact match
  • from_dt         — ISO-8601 datetime (inclusive lower bound)
  • to_dt           — ISO-8601 datetime (inclusive upper bound)
  • job_id          — filter results from a specific batch job

All filters are combinable. Results are ordered newest-first.
The query uses TimescaleDB-friendly composite indexes for performance.
"""

import uuid
from datetime import datetime

import structlog
from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.config import get_settings
from app.db.models import ScreeningResult as ScreeningResultModel
from app.dependencies import DBSession
from app.schemas.common import PaginatedResponse
from app.schemas.ecg import AAMILabel, BeatClassification, ScreeningResult

router = APIRouter()
logger = structlog.get_logger(__name__)
settings = get_settings()


@router.get(
    "/history",
    response_model=PaginatedResponse[ScreeningResult],
    summary="Retrieve past ECG screening results",
    description="""
Return a paginated list of past screening results, newest first.

**Filtering examples:**
- `?label=V` — only records where the dominant classification is Ventricular
- `?patient_id=patient-0042` — all records for a specific patient
- `?from_dt=2026-09-25T00:00:00Z&to_dt=2026-09-25T23:59:59Z` — date range
- `?label=V&from_dt=2026-09-25T12:00:00Z` — combined filters

**Performance note:** Queries hitting time ranges are accelerated by the
TimescaleDB hypertable partitioning on `created_at`.
    """,
    responses={
        200: {"description": "Paginated list of screening results"},
    },
)
async def get_history(
    db: DBSession,
    label: AAMILabel | None = Query(
        default=None,
        description="Filter by dominant AAMI label (N|S|V|F|Q)",
        examples={"ventricular": {"value": "V"}},
    ),
    patient_id: str | None = Query(
        default=None,
        max_length=64,
        description="Filter by patient identifier (exact match)",
    ),
    from_dt: datetime | None = Query(
        default=None,
        description="Start of date range (ISO-8601 UTC)",
        examples={"example": {"value": "2026-09-25T00:00:00Z"}},
    ),
    to_dt: datetime | None = Query(
        default=None,
        description="End of date range (ISO-8601 UTC)",
        examples={"example": {"value": "2026-09-25T23:59:59Z"}},
    ),
    job_id: uuid.UUID | None = Query(
        default=None,
        description="Filter results belonging to a specific batch job",
    ),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(
        default=None,
        ge=1,
        description=f"Items per page (max {settings.max_page_size})",
    ),
) -> PaginatedResponse[ScreeningResult]:
    # Resolve page_size
    effective_page_size = min(
        page_size or settings.default_page_size,
        settings.max_page_size,
    )

    # ── Database query (if DB is connected) ────────────────────────────────────
    if db is not None:
        try:
            stmt = select(ScreeningResultModel)

            if label is not None:
                stmt = stmt.where(ScreeningResultModel.dominant_label == label.value)
            if patient_id is not None:
                stmt = stmt.where(ScreeningResultModel.patient_id == patient_id)
            if from_dt is not None:
                stmt = stmt.where(ScreeningResultModel.created_at >= from_dt)
            if to_dt is not None:
                stmt = stmt.where(ScreeningResultModel.created_at <= to_dt)
            if job_id is not None:
                stmt = stmt.where(ScreeningResultModel.batch_job_id == job_id)

            # Count total matching records (without pagination)
            count_stmt = select(func.count()).select_from(stmt.subquery())
            total_result = await db.execute(count_stmt)
            total = total_result.scalar_one()

            # Apply ordering and pagination
            stmt = (
                stmt
                .order_by(ScreeningResultModel.created_at.desc())
                .offset((page - 1) * effective_page_size)
                .limit(effective_page_size)
            )

            rows = await db.execute(stmt)
            orm_results = rows.scalars().all()

            # ── Map ORM → schema ───────────────────────────────────────────────────────
            items = [_orm_to_schema(row) for row in orm_results]
            pages = max(1, (total + effective_page_size - 1) // effective_page_size)

            return PaginatedResponse(
                items=items,
                total=total,
                page=page,
                page_size=effective_page_size,
                pages=pages,
            )
        except Exception as exc:
            logger.debug("Database history query failed, falling back to in-memory store", error=str(exc))

    # ── In-memory history fallback (standalone demo mode) ───────────────────────
    from app.services.history_service import history_service
    return history_service.get_paginated(
        label=label,
        patient_id=patient_id,
        from_dt=from_dt,
        to_dt=to_dt,
        page=page,
        page_size=effective_page_size,
    )


def _orm_to_schema(row: ScreeningResultModel) -> ScreeningResult:
    beats = [BeatClassification(**b) for b in row.beats]
    return ScreeningResult(
        result_id=row.id,
        signal_id=row.signal_id,
        patient_id=row.patient_id,
        sample_rate=row.sample_rate,
        signal_length_samples=row.signal_length,
        total_beats=row.total_beats,
        beats=beats,
        dominant_label=AAMILabel(row.dominant_label) if row.dominant_label else None,
        label_summary=row.label_summary(),
        preprocessing_duration_ms=row.preprocessing_duration_ms or 0.0,
        inference_duration_ms=row.inference_duration_ms or 0.0,
        created_at=row.created_at.isoformat(),
    )


@router.get(
    "/history/{result_id}",
    response_model=ScreeningResult,
    summary="Retrieve a single screening result by ID",
    responses={
        200: {"description": "Screening result"},
        404: {"description": "Result not found"},
    },
)
async def get_result_by_id(
    result_id: uuid.UUID,
    db: DBSession,
) -> ScreeningResult:
    from fastapi import HTTPException
    from app.services.history_service import history_service

    # Check in-memory history first
    mem = history_service.get_by_id(result_id)
    if mem is not None:
        return mem

    if db is not None:
        try:
            stmt = select(ScreeningResultModel).where(ScreeningResultModel.id == result_id)
            row = (await db.execute(stmt)).scalars().first()
            if row is not None:
                return _orm_to_schema(row)
        except Exception as exc:
            logger.debug("Error querying single result from DB", error=str(exc))

    raise HTTPException(status_code=404, detail=f"Result {result_id} not found")
