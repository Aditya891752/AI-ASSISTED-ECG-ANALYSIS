"""
app/db/init_db.py
─────────────────
Creates tables on startup and converts `screening_results` into a
TimescaleDB hypertable partitioned on `created_at`.

TimescaleDB will silently no-op the create_hypertable call if:
  - The extension is not installed (Postgres without TimescaleDB), OR
  - The hypertable already exists.

This means the app runs fine on plain Postgres too — you just lose the
automatic time-based partitioning.
"""
from __future__ import annotations

import structlog
from sqlalchemy import text

from app.db.database import engine
from app.db.models import Base

logger = structlog.get_logger(__name__)

_HYPERTABLE_SQL = """
DO $$
BEGIN
    -- Only proceed if TimescaleDB is available
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
    ) THEN
        -- create_hypertable is idempotent with if_not_exists => true
        PERFORM create_hypertable(
            'screening_results',
            'created_at',
            chunk_time_interval => INTERVAL '1 day',
            if_not_exists       => TRUE
        );
        RAISE NOTICE 'TimescaleDB hypertable ready on screening_results';
    ELSE
        RAISE NOTICE 'TimescaleDB extension not found — running on plain PostgreSQL';
    END IF;
END;
$$;
"""


async def init_db() -> bool:
    """
    Create all ORM-mapped tables (if they don't exist) and configure
    the TimescaleDB hypertable. Called once during app startup via lifespan.
    Returns True if DB initialized, False if unavailable.
    """
    try:
        async with engine.begin() as conn:
            # Create tables defined by the ORM
            await conn.run_sync(Base.metadata.create_all)
            logger.info("ORM tables created (or already exist)")

            # Enable TimescaleDB hypertable (best-effort)
            try:
                await conn.execute(text(_HYPERTABLE_SQL))
                logger.info("TimescaleDB hypertable configured")
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "TimescaleDB hypertable setup skipped",
                    reason=str(exc),
                )
        return True
    except Exception as exc:
        logger.warning(
            "PostgreSQL database unavailable — running in standalone mode without DB persistence",
            reason=str(exc),
        )
        return False
