"""
app/schemas/common.py
─────────────────────
Reusable Pydantic v2 schemas: pagination, errors, health status.
"""
from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic wrapper for paginated list endpoints."""

    items: list[T]
    total: int = Field(..., description="Total matching records (across all pages)")
    page: int = Field(..., ge=1, description="Current page (1-indexed)")
    page_size: int = Field(..., ge=1, description="Items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")

    model_config = {"arbitrary_types_allowed": True}


class ErrorDetail(BaseModel):
    """Single structured error detail."""

    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    field: str | None = Field(default=None, description="Field that caused the error, if applicable")


class ErrorResponse(BaseModel):
    """Standard error envelope returned on all 4xx/5xx responses."""

    error: str = Field(..., description="Short error title")
    details: list[ErrorDetail] = Field(default_factory=list)
    request_id: str | None = Field(default=None, description="Trace/correlation ID")

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": "Validation failed",
                "details": [
                    {
                        "code": "invalid_signal",
                        "message": "Signal array must contain at least 360 samples",
                        "field": "signal",
                    }
                ],
                "request_id": "req_01j8hx3p7m",
            }
        }
    }


class ComponentHealth(BaseModel):
    """Health status of a single backend component."""

    status: str = Field(..., description="'ok' | 'degraded' | 'unavailable'")
    latency_ms: float | None = Field(default=None, description="Round-trip ping latency in ms")
    detail: str | None = Field(default=None)


class HealthResponse(BaseModel):
    """Response body for GET /health."""

    status: str = Field(..., description="Overall system status: 'ok' | 'degraded' | 'unavailable'")
    version: str
    environment: str
    components: dict[str, ComponentHealth] = Field(
        ...,
        description="Per-component health: model, database, redis",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "ok",
                "version": "1.0.0",
                "environment": "production",
                "components": {
                    "model": {"status": "ok", "latency_ms": None, "detail": "sklearn RandomForest loaded"},
                    "database": {"status": "ok", "latency_ms": 1.2, "detail": None},
                    "redis": {"status": "ok", "latency_ms": 0.4, "detail": None},
                },
            }
        }
    }
