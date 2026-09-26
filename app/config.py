"""
app/config.py
─────────────
Central configuration loaded from environment variables / .env file.
All settings are typed and validated by Pydantic-Settings at startup.
"""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    app_name: str = "PS-03 ECG Screening API"
    app_version: str = "1.0.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"

    # ── API ───────────────────────────────────────────────────────────────────
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["*"]
    max_upload_size_mb: int = Field(default=50, ge=1, le=500)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = (
        "postgresql+asyncpg://ecg:ecgpassword@localhost:5432/ecgdb"
    )

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Celery ────────────────────────────────────────────────────────────────
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    celery_task_soft_time_limit: int = 300
    celery_task_time_limit: int = 360

    # ── Model ─────────────────────────────────────────────────────────────────
    model_path: str = "model/model.pkl"
    model_cache_ttl: int = 3600

    # ── ECG Processing ────────────────────────────────────────────────────────
    ecg_sample_rate: int = Field(default=360, ge=100, le=10_000)
    ecg_stream_buffer_size: int = Field(default=1800, ge=360)
    ecg_batch_size: int = Field(default=256, ge=1, le=4096)

    # ── Cache ─────────────────────────────────────────────────────────────────
    result_cache_ttl: int = 300
    model_cache_ttl: int = 3600

    # ── Rate Limits ───────────────────────────────────────────────────────────
    rate_limit_screen: str = "60/minute"
    rate_limit_batch: str = "10/minute"

    # ── Pagination ────────────────────────────────────────────────────────────
    default_page_size: int = Field(default=20, ge=1, le=100)
    max_page_size: int = Field(default=100, ge=1, le=1000)

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton. Import this everywhere."""
    return Settings()
