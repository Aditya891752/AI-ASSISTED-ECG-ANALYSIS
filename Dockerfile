# ─────────────────────────────────────────────────────────────────────────────
# PS-03 ECG Screening API — Dockerfile
# Multi-stage build for minimal production image
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: dependency builder
FROM python:3.11-slim AS builder

WORKDIR /build

# System deps for scipy/numpy compilation (prebuilt wheels, so usually not needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: runtime image
FROM python:3.11-slim AS runtime

# Non-root user for security
RUN groupadd -r ecg && useradd -r -g ecg ecg

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY app/ ./app/

# Create model directory (mount model.pkl at runtime)
RUN mkdir -p model && chown -R ecg:ecg /app

USER ecg

EXPOSE 8000

# UVICORN_WORKERS defaults to 2; override via env for production
ENV UVICORN_WORKERS=2

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS} --log-config /dev/null"]
