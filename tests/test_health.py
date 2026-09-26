"""tests/test_health.py — Health endpoint tests."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_health_returns_200_when_model_loaded(client):
    """Health endpoint returns 200 when model is loaded."""
    with patch("app.routers.health.ping_db", new_callable=AsyncMock, return_value=1.2):
        with patch("app.routers.health.ping_redis", new_callable=AsyncMock, return_value=0.4):
            response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model" in data["components"]
    assert "database" in data["components"]
    assert "redis" in data["components"]
    assert data["components"]["model"]["status"] == "ok"


@pytest.mark.asyncio
async def test_health_503_when_db_down(client):
    """Health endpoint returns 503 when DB is unavailable."""
    with patch("app.routers.health.ping_db", side_effect=Exception("Connection refused")):
        with patch("app.routers.health.ping_redis", new_callable=AsyncMock, return_value=0.4):
            response = await client.get("/health")

    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unavailable"
    assert data["components"]["database"]["status"] == "unavailable"


@pytest.mark.asyncio
async def test_metrics_endpoint(client):
    """Metrics endpoint returns Prometheus text format."""
    response = await client.get("/metrics")
    assert response.status_code == 200
    # Prometheus text format starts with # HELP or a metric name
    assert "ecg_" in response.text or "# HELP" in response.text
