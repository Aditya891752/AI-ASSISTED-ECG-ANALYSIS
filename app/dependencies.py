"""
app/dependencies.py
────────────────────
FastAPI dependency providers — imported by all routers.
"""
from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import Depends, HTTPException, Request, status

from app.db.database import AsyncSession, get_db
from app.services.model_service import ModelService, ModelNotLoadedError

logger = structlog.get_logger(__name__)


async def get_model_service(request: Request) -> ModelService:
    """
    Retrieve the ModelService singleton from app.state.
    Returns 503 if the model failed to load at startup.
    """
    model_service: ModelService | None = getattr(request.app.state, "model_service", None)
    if model_service is None or not model_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Model unavailable",
                "details": [
                    {
                        "code": "model_not_loaded",
                        "message": (
                            "The ML model is not loaded. "
                            "Ensure model/model.pkl or model/model.pt exists and restart the service."
                        ),
                    }
                ],
            },
        )
    return model_service


# ── Type aliases for clean router signatures ───────────────────────────────────
DBSession = Annotated[AsyncSession, Depends(get_db)]
ModelDep = Annotated[ModelService, Depends(get_model_service)]
