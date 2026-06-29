# Enrichment Worker

Standalone Python + LangGraph worker that drains the `jobs` queue and runs the
enrichment graph (`parse → research → draft → validate → assemble`). Decoupled
from the web tier — it talks to Supabase/Postgres only. See `docs/ARCHITECTURE.md` §5.

## Develop

```bash
uv sync                       # install deps + dev group
uv run worker                 # start the job poller (reads DATABASE_URL)
uv run pytest                 # tests
uv run ruff check .           # lint
uv run mypy                   # type-check
```

## Layout

- `src/worker/poller.py` — `SELECT … FOR UPDATE SKIP LOCKED` job loop. Transient
  model failures (rate limits, brief upstream blips) requeue the job for a later
  retry rather than failing it; a job fails for good on any other error or once
  it has exhausted `MAX_ATTEMPTS` (default 5). The OpenAI client also retries
  each call with backoff (`OPENAI_MAX_RETRIES`, default 8) so a saturated
  tokens-per-minute window is usually ridden out within the call.
- `src/worker/pipeline/` — preprocessing, fetch, persist stages.
- `src/worker/graph/` — LangGraph nodes.
- `src/worker/models/` — hand-written Pydantic models: the source of truth for
  the worker's domain mirrors and the structured-output field contract. Kept in
  sync with the SQL schema via a contract test (`tests/test_model_contract.py`).
- `src/worker/observability.py` — optional LangSmith tracing setup.

## Observability (LangSmith)

Tracing is **off by default**. Set `LANGSMITH_TRACING=true` plus `LANGSMITH_API_KEY`
(optionally `LANGSMITH_PROJECT`, `LANGSMITH_ENDPOINT`) in `.env` to stream each
enrichment run — node spans plus the OpenAI prompts/tokens — to LangSmith. It is
additive developer tooling for debugging and eval datasets; the `runs` table stays
the persisted source of truth for reviewer provenance.
