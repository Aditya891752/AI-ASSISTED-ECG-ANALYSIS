"""
app/workers/celery_app.py
─────────────────────────
Celery application configuration.

The Celery app is importable by both:
  - The FastAPI process (to dispatch tasks via .delay() / .apply_async())
  - The worker process (to execute tasks)

Redis DB allocation:
  - DB 0 → FastAPI general Redis (caching, rate-limit state)
  - DB 1 → Celery broker (task messages)
  - DB 2 → Celery result backend (task state + results)
"""
from __future__ import annotations

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "ps03_ecg",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    # ── Serialization ─────────────────────────────────────────────────────────
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # ── Timezone ──────────────────────────────────────────────────────────────
    timezone="UTC",
    enable_utc=True,
    # ── Task execution ────────────────────────────────────────────────────────
    task_soft_time_limit=settings.celery_task_soft_time_limit,
    task_time_limit=settings.celery_task_time_limit,
    task_acks_late=True,           # ACK after task completes, not when received
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,  # One task at a time per worker = fair dispatch
    # ── Result backend ────────────────────────────────────────────────────────
    result_expires=86400,          # Task results expire after 24 h
    result_extended=True,          # Store full task metadata (start/end time, etc.)
    # ── Retry policy ─────────────────────────────────────────────────────────
    task_max_retries=3,
    task_default_retry_delay=30,   # 30-second back-off before retry
    # ── Routing ───────────────────────────────────────────────────────────────
    task_routes={
        "app.workers.tasks.process_batch_task": {"queue": "batch"},
    },
    task_default_queue="default",
    # ── Monitoring ────────────────────────────────────────────────────────────
    worker_send_task_events=True,
    task_send_sent_event=True,
)
