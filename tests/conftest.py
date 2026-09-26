"""
tests/conftest.py
─────────────────
Shared fixtures for the PS-03 test suite.
Uses httpx.AsyncClient for async endpoint testing.
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# ── Test signal factory ────────────────────────────────────────────────────────
SAMPLE_RATE = 360
SIGNAL_LENGTH = 3600  # 10 seconds


def make_ecg_signal(length: int = SIGNAL_LENGTH, seed: int = 42) -> list[float]:
    """Generate a synthetic ECG-like signal for testing."""
    rng = np.random.default_rng(seed)
    t = np.linspace(0, length / SAMPLE_RATE, length)
    # Simple synthetic: slow baseline + some oscillations
    signal = (
        0.5 * np.sin(2 * np.pi * 1.2 * t)
        + 0.1 * np.sin(2 * np.pi * 10 * t)
        + 0.05 * rng.standard_normal(length)
    )
    return signal.tolist()


# ── Model service mock ─────────────────────────────────────────────────────────

def make_mock_model_service(n_beats: int = 5) -> MagicMock:
    """Return a mock ModelService that returns predictable classifications."""
    mock = MagicMock()
    mock.is_loaded = True
    mock.model_type = "sklearn"

    async def fake_predict(feature_matrix: np.ndarray):
        n = feature_matrix.shape[0]
        labels = ["N"] * n
        confidences = [0.95] * n
        proba_dicts = [
            {"N": 0.95, "S": 0.02, "V": 0.02, "F": 0.005, "Q": 0.005}
        ] * n
        return labels, confidences, proba_dicts

    mock.predict = fake_predict
    return mock


# ── App fixture ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for the whole test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_app():
    """
    Create the FastAPI app with mocked DB and model for unit testing.
    Does NOT require a running PostgreSQL or Redis.
    """
    from unittest.mock import patch, AsyncMock

    # Patch database so tests don't need Postgres
    mock_session = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.flush = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one=MagicMock(return_value=0), scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.db.init_db.init_db", new_callable=AsyncMock):
        from app.main import create_app
        app = create_app()

    # Inject mock model service
    app.state.model_service = make_mock_model_service()
    return app


@pytest_asyncio.fixture
async def client(test_app) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client for testing endpoints."""
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://testserver",
    ) as ac:
        yield ac
