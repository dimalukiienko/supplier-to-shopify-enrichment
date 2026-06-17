"""Worker runtime configuration, loaded from the environment."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# The shared .env lives at the repo root; resolve it absolutely so the worker
# picks it up no matter which directory it is launched from.
_ENV_FILE = Path(__file__).resolve().parents[4] / ".env"


class WorkerConfig(BaseSettings):
    """Environment-driven worker settings (see repo `.env.example`)."""

    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    database_url: str = ""
    openai_api_key: str = ""
    poll_interval_seconds: float = 2.0
    batch_size: int = 1
    # When true, exit once the queue is empty instead of polling forever
    # (handy for one-shot local runs: `WORKER_DRAIN=true uv run worker`).
    drain: bool = False
