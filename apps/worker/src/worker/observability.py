"""LangSmith tracing setup — optional, opt-in developer observability.

The enrichment graph already persists per-node provenance to the `runs` table
(`GraphState.node_traces`); that is the source of truth for reviewers. LangSmith
is *additive*: when enabled it traces the LangGraph run (node spans) and — via
the `wrap_openai` client in `worker.llm` — the underlying OpenAI calls (prompts,
completions, tokens), which is far easier to debug and to build eval datasets
from than reading JSONB.

Tracing is **off by default**. It activates only when both `langsmith_tracing`
and `langsmith_api_key` are set, so CI/tests stay offline and nothing leaves the
system unless explicitly opted in (`LANGSMITH_TRACING=true` + a key in `.env`).

`pydantic-settings` reads `.env` into `WorkerConfig` but does not export to the
process environment, while the LangSmith SDK / LangGraph read `LANGSMITH_*` from
`os.environ` at runtime — so this module bridges the two by setting those vars.
"""

from __future__ import annotations

import logging
import os

from worker.config import WorkerConfig

logger = logging.getLogger("worker.observability")


def configure_tracing(config: WorkerConfig) -> bool:
    """Enable LangSmith tracing from config; return whether it was enabled.

    No-op (returns False) unless `langsmith_tracing` is true and an API key is
    present. When enabled, exports the env vars the LangSmith SDK and LangGraph
    read, so the wrapped OpenAI client and graph auto-tracing both activate.
    """
    if not (config.langsmith_tracing and config.langsmith_api_key):
        return False

    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGSMITH_API_KEY"] = config.langsmith_api_key
    os.environ["LANGSMITH_PROJECT"] = config.langsmith_project
    if config.langsmith_endpoint:
        os.environ["LANGSMITH_ENDPOINT"] = config.langsmith_endpoint

    logger.info("LangSmith tracing enabled (project=%s)", config.langsmith_project)
    return True


def tracing_enabled() -> bool:
    """True if `configure_tracing` has turned tracing on in this process."""
    return os.environ.get("LANGSMITH_TRACING") == "true"
