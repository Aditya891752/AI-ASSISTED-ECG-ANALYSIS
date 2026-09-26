"""
app/services/history_service.py
───────────────────────────────
In-memory history store for screening results.
Provides instant history, pagination, and filtering when PostgreSQL is offline,
ensuring the Dashboard charts, stat cards, and /history page are fully interactive.
"""
from __future__ import annotations

import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Any

import structlog

from app.schemas.common import PaginatedResponse
from app.schemas.ecg import AAMILabel, ScreeningResult

logger = structlog.get_logger(__name__)


class HistoryService:
    def __init__(self, max_items: int = 500) -> None:
        self._history: deque[ScreeningResult] = deque(maxlen=max_items)
        self._by_id: dict[uuid.UUID, ScreeningResult] = {}

    def add(self, result: ScreeningResult) -> None:
        """Store a screening result in the in-memory history buffer."""
        self._history.appendleft(result)
        self._by_id[result.result_id] = result
        logger.debug("Added screening result to in-memory history", result_id=str(result.result_id))

    def get_by_id(self, result_id: uuid.UUID) -> ScreeningResult | None:
        return self._by_id.get(result_id)

    def get_paginated(
        self,
        *,
        label: AAMILabel | None = None,
        patient_id: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> PaginatedResponse[ScreeningResult]:
        """Filter and paginate in-memory results."""
        filtered = list(self._history)

        if label is not None:
            filtered = [r for r in filtered if r.dominant_label == label]

        if patient_id is not None:
            filtered = [r for r in filtered if r.patient_id == patient_id]

        if from_dt is not None:
            filtered = [
                r for r in filtered
                if datetime.fromisoformat(r.created_at) >= from_dt
            ]

        if to_dt is not None:
            filtered = [
                r for r in filtered
                if datetime.fromisoformat(r.created_at) <= to_dt
            ]

        total = len(filtered)
        start = (page - 1) * page_size
        end = start + page_size
        items = filtered[start:end]

        return PaginatedResponse[ScreeningResult](
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=max(1, (total + page_size - 1) // page_size),
        )


history_service = HistoryService()
