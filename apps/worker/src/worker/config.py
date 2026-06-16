"""Worker runtime configuration, loaded from the environment."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerConfig(BaseSettings):
    """Environment-driven worker settings (see repo `.env.example`)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    openai_api_key: str = ""
    poll_interval_seconds: float = 2.0
    batch_size: int = 1
