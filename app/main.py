"""app/main.py — FastAPI application factory with lifespan, middleware, and router registration."""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import get_settings
from app.db.init_db import init_db
from app.routers import health, history, jobs, screening, streaming
from app.services.model_service import ModelService
from app.utils.logging_config import configure_logging
from app.utils.metrics import REQUEST_LATENCY

settings = get_settings()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    configure_logging(settings.log_level)
    logger.info("Starting PS-03 ECG Screening API", version=settings.app_version)

    await init_db()
    logger.info("Database initialized")

    model_service = ModelService(model_path=settings.model_path)
    try:
        await model_service.load()
        logger.info(
            "Model loaded",
            path=settings.model_path,
            model_type=model_service.model_type,
        )
    except FileNotFoundError:
        logger.warning(
            "Model file not found — API will start but /screen endpoints return 503",
            path=settings.model_path,
        )

    app.state.model_service = model_service

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("Shutting down PS-03 ECG Screening API")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="""
## PS-03 AI-Assisted ECG Screening API

Real-time ECG heartbeat classification using the **AAMI EC57 standard** (5 classes):

| Label | Class | Description |
|-------|-------|-------------|
| **N** | Normal | Normal / LBBB / RBBB beats |
| **S** | Supraventricular | Atrial/junctional ectopic |
| **V** | Ventricular | PVCs and ventricular ectopic |
| **F** | Fusion | Fusion of normal + ventricular |
| **Q** | Unknown | Paced or unclassifiable |

### Endpoints at a glance

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/screen` | Single-shot ECG analysis |
| `WS`   | `/api/v1/stream` | Real-time streaming analysis |
| `POST` | `/api/v1/screen/batch` | Async batch processing |
| `GET`  | `/api/v1/jobs/{id}` | Poll batch job status |
| `GET`  | `/api/v1/history` | Paginated result history |
| `GET`  | `/health` | System health check |
| `GET`  | `/metrics` | Prometheus metrics |
        """,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── Rate limiter ───────────────────────────────────────────────────────────
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── Middleware ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    @app.middleware("http")
    async def track_request_latency(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        latency = time.perf_counter() - start
        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code,
        ).observe(latency)
        return response

    # ── Routers ───────────────────────────────────────────────────────────────
    prefix = settings.api_prefix
    app.include_router(health.router, tags=["Health"])
    app.include_router(screening.router, prefix=prefix, tags=["Screening"])
    app.include_router(streaming.router, prefix=prefix, tags=["Streaming"])
    app.include_router(jobs.router, prefix=prefix, tags=["Jobs"])
    app.include_router(history.router, prefix=prefix, tags=["History"])

    # ── Prometheus instrumentation ─────────────────────────────────────────────
    Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
    ).instrument(app).expose(app, endpoint="/metrics", tags=["Observability"])

    return app


app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_config=None,
    )
