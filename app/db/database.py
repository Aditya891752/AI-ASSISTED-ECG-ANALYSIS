"""
app/db/database.py
──────────────────
Async SQLAlchemy engine + session factory backed by asyncpg.
Uses a context-managed session for each request to guarantee connection release.
"""
from __future__ import annotations

from collections.abc import AsyncGenerator

import structlog
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

# One engine per process — reuses the asyncpg connection pool.
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,          # detect stale connections
    pool_recycle=3600,           # recycle connections after 1 h
    connect_args={
        "server_settings": {
            "application_name": "ps03-ecg-api",
            "jit": "off",        # disable JIT for short-lived queries
        }
    },
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a database session.
    The session is always closed — even on exceptions.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except SQLAlchemyError as exc:
            await session.rollback()
            logger.error("Database session error", exc_info=exc)
            raise
        finally:
            await session.close()


async def ping_db() -> float:
    """
    Execute a lightweight round-trip query and return latency in ms.
    Used by GET /health.
    """
    import time
    from sqlalchemy import text

    start = time.perf_counter()
    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT 1"))
    return (time.perf_counter() - start) * 1000
