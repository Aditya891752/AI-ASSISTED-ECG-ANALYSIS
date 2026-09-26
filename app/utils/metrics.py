"""
app/utils/metrics.py
────────────────────
Prometheus metric collectors.
Imported by routers and services to record domain-level events
(beyond the auto-instrumented HTTP metrics from prometheus-fastapi-instrumentator).
"""
from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram

# ── HTTP / Latency ─────────────────────────────────────────────────────────────
REQUEST_LATENCY = Histogram(
    "ecg_request_latency_seconds",
    "End-to-end HTTP request latency",
    labelnames=["method", "endpoint", "status"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)

# ── Model Inference ────────────────────────────────────────────────────────────
INFERENCE_LATENCY = Histogram(
    "ecg_inference_latency_seconds",
    "Model inference time per batch",
    labelnames=["model_type"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)

INFERENCE_BATCH_SIZE = Histogram(
    "ecg_inference_batch_size_beats",
    "Number of beats per inference batch",
    buckets=(1, 4, 8, 16, 32, 64, 128, 256, 512, 1024),
)

# ── Beat Classifications ───────────────────────────────────────────────────────
BEATS_CLASSIFIED = Counter(
    "ecg_beats_classified_total",
    "Total beats classified, by AAMI label",
    labelnames=["label"],
)

ABNORMAL_BEATS = Counter(
    "ecg_abnormal_beats_total",
    "Beats classified as non-Normal (S, V, F, Q)",
    labelnames=["label"],
)

# ── Batch Jobs ─────────────────────────────────────────────────────────────────
BATCH_JOBS_SUBMITTED = Counter(
    "ecg_batch_jobs_submitted_total",
    "Total batch jobs submitted",
)

BATCH_JOBS_COMPLETED = Counter(
    "ecg_batch_jobs_completed_total",
    "Batch jobs completed successfully",
)

BATCH_JOBS_FAILED = Counter(
    "ecg_batch_jobs_failed_total",
    "Batch jobs that failed",
)

BATCH_QUEUE_DEPTH = Gauge(
    "ecg_batch_queue_depth",
    "Current number of batch jobs in queue",
)

# ── WebSocket Streaming ────────────────────────────────────────────────────────
WS_ACTIVE_CONNECTIONS = Gauge(
    "ecg_ws_active_connections",
    "Active WebSocket streaming connections",
)

WS_CHUNKS_RECEIVED = Counter(
    "ecg_ws_chunks_received_total",
    "Total signal chunks received over WebSocket",
)

# ── Preprocessing ─────────────────────────────────────────────────────────────
PREPROCESSING_LATENCY = Histogram(
    "ecg_preprocessing_latency_seconds",
    "ECG preprocessing (filter + R-peak detection) latency",
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0),
)

# ── Cache ─────────────────────────────────────────────────────────────────────
CACHE_HITS = Counter(
    "ecg_cache_hits_total",
    "Redis cache hits",
    labelnames=["operation"],
)

CACHE_MISSES = Counter(
    "ecg_cache_misses_total",
    "Redis cache misses",
    labelnames=["operation"],
)
