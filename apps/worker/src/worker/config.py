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
    # How many times the OpenAI client retries a single call (with exponential
    # backoff honouring the rate-limit reset headers) before raising. Bumped
    # above the SDK default of 2 so a saturated tokens-per-minute window is ridden
    # out within the call rather than surfacing as a job failure. Set via
    # `OPENAI_MAX_RETRIES`.
    openai_max_retries: int = 8
    # How many times a job is attempted before it is marked `failed` for good.
    # A transient failure (rate-limit saturation, a brief upstream/network blip)
    # returns the job to the queue instead of failing it; once `attempts` reaches
    # this many, the next failure is terminal. Set via `MAX_ATTEMPTS`.
    max_attempts: int = 5
    # Web research tool (research node). Empty → research is a no-op (Stage 1
    # deferral default; also keeps CI/tests offline).
    web_search_api_key: str = ""
    poll_interval_seconds: float = 2.0
    batch_size: int = 1
    # When true, exit once the queue is empty instead of polling forever
    # (handy for one-shot local runs: `WORKER_DRAIN=true uv run worker`).
    drain: bool = False

    # Observability — LangSmith tracing of the LangGraph run (see
    # `worker.observability`). Off by default: tracing activates only when
    # `langsmith_tracing` is true *and* an API key is set, so CI/tests stay
    # offline and no data leaves the system unless explicitly opted in.
    langsmith_tracing: bool = False
    langsmith_api_key: str = ""
    langsmith_project: str = "supplier-enrichment"
    # Optional override for self-hosted / EU LangSmith; empty uses the default.
    langsmith_endpoint: str = ""
