"""
app/schemas/jobs.py
───────────────────
Pydantic v2 schemas for async batch job management.
"""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobResponse(BaseModel):
    """
    Returned immediately by `POST /screen/batch`.
    Use `job_id` to poll `GET /jobs/{job_id}`.
    """

    job_id: UUID = Field(..., description="Unique job identifier — use this to poll status")
    status: JobStatus = Field(default=JobStatus.PENDING)
    total_signals: int = Field(..., description="Total signals submitted in this batch")
    message: str = Field(default="Job queued for processing")
    poll_url: str = Field(..., description="Convenience URL to poll job status")

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "status": "pending",
                "total_signals": 500,
                "message": "Job queued for processing",
                "poll_url": "/api/v1/jobs/3fa85f64-5717-4562-b3fc-2c963f66afa6",
            }
        }
    }


class LabelSummary(BaseModel):
    N: int = 0
    S: int = 0
    V: int = 0
    F: int = 0
    Q: int = 0


class JobResultSummary(BaseModel):
    """Aggregate statistics across all signals in a completed batch job."""

    total_beats: int
    label_counts: LabelSummary
    abnormal_beat_rate: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Fraction of beats classified as non-Normal (S+V+F+Q / total)",
    )
    signals_with_abnormal_beats: int
    failed_signals: int


class JobDetailResponse(BaseModel):
    """
    Full job status response from `GET /jobs/{job_id}`.
    When status == 'completed', `result_summary` and `result_ids` are populated.
    """

    job_id: UUID
    status: JobStatus
    total_signals: int
    processed_signals: int = Field(..., description="Signals processed so far")
    failed_signals: int = Field(default=0)
    progress_pct: float = Field(..., ge=0.0, le=100.0, description="Processing progress 0–100%")
    error_message: str | None = Field(default=None, description="Set on failure")
    result_summary: JobResultSummary | None = Field(
        default=None,
        description="Populated when status == 'completed'",
    )
    result_ids: list[UUID] | None = Field(
        default=None,
        description="List of ScreeningResult IDs produced — query /history to retrieve them",
    )
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "status": "completed",
                "total_signals": 500,
                "processed_signals": 500,
                "failed_signals": 2,
                "progress_pct": 100.0,
                "error_message": None,
                "result_summary": {
                    "total_beats": 5842,
                    "label_counts": {"N": 5100, "S": 380, "V": 290, "F": 42, "Q": 30},
                    "abnormal_beat_rate": 0.127,
                    "signals_with_abnormal_beats": 187,
                    "failed_signals": 2,
                },
                "created_at": "2026-09-25T13:00:00Z",
                "started_at": "2026-09-25T13:00:01Z",
                "completed_at": "2026-09-25T13:02:14Z",
            }
        }
    }
