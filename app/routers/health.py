"""
app/routers/health.py
──────────────────────
GET /health  — deep health check for model, database, and Redis
GET /metrics — Prometheus exposition (additional hand-crafted endpoint;
               the prometheus-fastapi-instrumentator also exposes /metrics)
"""
from __future__ import annotations

import time

import structlog
from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.db.database import ping_db
from app.schemas.common import ComponentHealth, HealthResponse
from app.services.cache_service import ping_redis
from app.services.model_service import ModelService

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System health check",
    description=(
        "Returns the operational status of all backend components: "
        "ML model, PostgreSQL/TimescaleDB, and Redis. "
        "A 200 response means all components are healthy. "
        "A 503 is returned if any critical component is unavailable."
    ),
    tags=["Health"],
)
async def health_check(request: Request) -> JSONResponse:
    from app.config import get_settings

    settings = get_settings()
    components: dict[str, ComponentHealth] = {}
    overall_ok = True

    # ── Model ──────────────────────────────────────────────────────────────────
    model_service: ModelService | None = getattr(request.app.state, "model_service", None)
    model_ok = bool(model_service and model_service.is_loaded)
    if model_ok:
        components["model"] = ComponentHealth(
            status="ok",
            detail=f"{model_service.model_type} model loaded from {settings.model_path}",
        )
    else:
        components["model"] = ComponentHealth(
            status="unavailable",
            detail="Model not loaded — drop model.pkl or model.pt into model/ and restart",
        )

    # ── Database ───────────────────────────────────────────────────────────────
    db_ok = True
    try:
        db_latency = await ping_db()
        components["database"] = ComponentHealth(status="ok", latency_ms=round(db_latency, 2))
    except Exception as exc:  # noqa: BLE001
        logger.debug("DB health check failed", error=str(exc))
        components["database"] = ComponentHealth(
            status="unavailable",
            detail="PostgreSQL offline (screening works in standalone mode)",
        )
        db_ok = False

    # ── Redis ──────────────────────────────────────────────────────────────────
    redis_ok = True
    try:
        redis_latency = await ping_redis()
        components["redis"] = ComponentHealth(status="ok", latency_ms=round(redis_latency, 2))
    except Exception as exc:  # noqa: BLE001
        logger.debug("Redis health check failed", error=str(exc))
        components["redis"] = ComponentHealth(
            status="unavailable",
            detail="Redis offline (caching disabled)",
        )
        redis_ok = False

    if not model_ok:
        overall_status = "unavailable"
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    elif not db_ok or not redis_ok:
        overall_status = "degraded"
        http_status = status.HTTP_200_OK
    else:
        overall_status = "ok"
        http_status = status.HTTP_200_OK

    response = HealthResponse(
        status=overall_status,
        version=settings.app_version,
        environment=settings.environment,
        components=components,
    )
    return JSONResponse(content=response.model_dump(), status_code=http_status)


@router.get(
    "/metrics",
    summary="Prometheus metrics",
    description="Exposes custom Prometheus metrics in the standard text exposition format.",
    response_class=PlainTextResponse,
    tags=["Observability"],
    include_in_schema=True,
)
async def prometheus_metrics() -> PlainTextResponse:
    return PlainTextResponse(
        content=generate_latest().decode("utf-8"),
        media_type=CONTENT_TYPE_LATEST,
    )
