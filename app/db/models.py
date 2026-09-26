"""
app/db/models.py
────────────────
SQLAlchemy ORM models.

`screening_results` is designed to be a TimescaleDB hypertable partitioned
on `created_at`. All indexes are crafted for the access patterns described
in the architecture notes — especially time-range + label filtering.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class ScreeningResult(Base):
    """
    One row per screened ECG signal.

    `beats` stores the per-beat classification array as JSONB so we can
    quickly retrieve all results without joining extra tables, while still
    being able to do GIN-indexed JSONB queries when needed.

    TimescaleDB will partition this table on `created_at` automatically
    after `create_hypertable()` is called in init_db.py.
    """

    __tablename__ = "screening_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(String(64), nullable=True)
    signal_id = Column(String(64), nullable=False, default=lambda: str(uuid.uuid4()))

    # Full per-beat detail: list of {beat_index, r_peak_sample, r_peak_time_s,
    #                                label, confidence, probabilities}
    beats = Column(JSON, nullable=False)

    # Denormalised summary (avoids unpacking the JSON on every filter query)
    total_beats = Column(Integer, nullable=False, default=0)
    dominant_label = Column(String(1), nullable=True)

    # Counts per label — stored flat for fast aggregation
    count_n = Column(Integer, nullable=False, default=0)
    count_s = Column(Integer, nullable=False, default=0)
    count_v = Column(Integer, nullable=False, default=0)
    count_f = Column(Integer, nullable=False, default=0)
    count_q = Column(Integer, nullable=False, default=0)

    # Signal metadata
    sample_rate = Column(Integer, nullable=False)
    signal_length = Column(Integer, nullable=False)

    # Performance telemetry
    preprocessing_duration_ms = Column(Float, nullable=True)
    inference_duration_ms = Column(Float, nullable=True)

    # Link to parent batch job (NULL for single-shot screens)
    batch_job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("batch_jobs.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── TimescaleDB partition key ──────────────────────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        # Time-range scans (most queries include a time filter)
        Index("ix_sr_created_at", "created_at"),
        # "All abnormal beats in last N minutes" — most critical query
        Index("ix_sr_label_created_at", "dominant_label", "created_at"),
        # Per-patient history, newest first
        Index("ix_sr_patient_created_at", "patient_id", "created_at"),
        # Batch results lookup
        Index("ix_sr_batch_job_id", "batch_job_id"),
    )

    def label_summary(self) -> dict[str, int]:
        return {
            "N": self.count_n,
            "S": self.count_s,
            "V": self.count_v,
            "F": self.count_f,
            "Q": self.count_q,
        }


class BatchJob(Base):
    """
    Tracks the lifecycle of an async batch screening job.
    A job is created synchronously; a Celery worker updates it asynchronously.
    """

    __tablename__ = "batch_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Celery task ID — set once the worker picks up the job
    celery_task_id = Column(String(255), nullable=True, unique=True)

    status = Column(
        SAEnum(
            "pending", "processing", "completed", "failed",
            name="job_status_enum",
            create_type=True,
        ),
        nullable=False,
        default="pending",
        server_default="pending",
    )

    total_signals = Column(Integer, nullable=False)
    processed_signals = Column(Integer, nullable=False, default=0)
    failed_signals = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)

    # JSON blob with aggregate stats after completion
    result_summary = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    results = relationship(
        "ScreeningResult",
        backref="batch_job",
        lazy="dynamic",
        foreign_keys="ScreeningResult.batch_job_id",
    )

    __table_args__ = (
        Index("ix_bj_status_created_at", "status", "created_at"),
        Index("ix_bj_celery_task_id", "celery_task_id"),
    )

    @property
    def progress_pct(self) -> float:
        if self.total_signals == 0:
            return 0.0
        return round(self.processed_signals / self.total_signals * 100, 1)
