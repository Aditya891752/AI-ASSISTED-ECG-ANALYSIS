"""
app/services/cache_service.py
──────────────────────────────
Redis helpers: result caching, distributed locks, and metric counters.
Uses the async redis-py client.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any

import redis.asyncio as aioredis
import structlog

from app.config import get_settings
from app.utils.metrics import CACHE_HITS, CACHE_MISSES

logger = structlog.get_logger(__name__)
settings = get_settings()

# Module-level connection pool — shared across all requests in this process
_pool: aioredis.ConnectionPool | None = None


def get_redis_pool() -> aioredis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = aioredis.ConnectionPool.from_url(
            settings.redis_url,
            max_connections=50,
            decode_responses=True,
        )
    return _pool


def get_redis_client() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=get_redis_pool())


async def ping_redis() -> float:
    """Health-check ping — returns round-trip latency in ms."""
    import time
    client = get_redis_client()
    start = time.perf_counter()
    await client.ping()
    return (time.perf_counter() - start) * 1000


async def is_redis_available() -> bool:
    """Check if Redis broker is reachable with a quick 0.3s timeout."""
    import asyncio
    try:
        await asyncio.wait_for(ping_redis(), timeout=0.3)
        return True
    except Exception:
        return False


# ── Result Caching ────────────────────────────────────────────────────────────

def _make_cache_key(signal_hash: str) -> str:
    return f"ecg:result:{signal_hash}"


def hash_signal(signal: list[float] | dict[str, list[float]]) -> str:
    """Stable hash of a signal array or multi-lead dictionary for use as a cache key."""
    if isinstance(signal, dict):
        raw = json.dumps({k: signal[k] for k in sorted(signal.keys())}, separators=(",", ":")).encode()
    else:
        raw = json.dumps(signal, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()[:32]



async def get_cached_result(signal_hash: str) -> dict[str, Any] | None:
    """Return cached screening result dict, or None on cache miss or when Redis is offline."""
    key = _make_cache_key(signal_hash)
    try:
        client = get_redis_client()
        raw = await client.get(key)
        if raw is not None:
            CACHE_HITS.labels(operation="screening_result").inc()
            return json.loads(raw)
        CACHE_MISSES.labels(operation="screening_result").inc()
    except Exception as exc:
        logger.debug("Redis cache get skipped", error=str(exc))
    return None


async def cache_result(
    signal_hash: str,
    result: dict[str, Any],
    ttl: int | None = None,
) -> None:
    """Store a screening result dict in Redis (best-effort)."""
    key = _make_cache_key(signal_hash)
    try:
        client = get_redis_client()
        ttl = ttl or settings.result_cache_ttl
        await client.setex(key, ttl, json.dumps(result, default=str))
        logger.debug("Cached screening result", key=key, ttl=ttl)
    except Exception as exc:
        logger.debug("Redis cache store skipped", error=str(exc))


# ── Job State ─────────────────────────────────────────────────────────────────

async def set_job_progress(job_id: str, processed: int, total: int) -> None:
    """Store lightweight job progress (for fast polling without DB hits)."""
    client = get_redis_client()
    key = f"ecg:job:progress:{job_id}"
    await client.hset(key, mapping={"processed": processed, "total": total})  # type: ignore[arg-type]
    await client.expire(key, 86400)  # expire after 24 h


async def get_job_progress(job_id: str) -> dict[str, int] | None:
    client = get_redis_client()
    key = f"ecg:job:progress:{job_id}"
    data = await client.hgetall(key)
    if not data:
        return None
    return {"processed": int(data["processed"]), "total": int(data["total"])}
