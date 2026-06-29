# Enrichment Worker

Standalone Python + LangGraph worker that drains the `jobs` queue and runs the
enrichment graph (`parse → research → draft → validate → assemble`). Decoupled
from the web tier — it talks to Supabase/Postgres only. See `docs/ARCHITECTURE.md` §5.

## Develop

```bash
uv sync                       # install deps + dev group
uv run worker                 # start the job poller (reads DATABASE_URL)
CONCURRENCY=8 uv run worker   # run 8 jobs at once in one process (default 4)
uv run pytest                 # tests
uv run ruff check .           # lint
uv run mypy                   # type-check
```

## Layout

- `src/worker/poller.py` — `SELECT … FOR UPDATE SKIP LOCKED` job loop; runs
  `CONCURRENCY` such loops at once, each on its own DB connection.
- `src/worker/pipeline/` — preprocessing, fetch, persist stages.
- `src/worker/graph/` — LangGraph nodes.
- `src/worker/models/` — hand-written Pydantic models: the source of truth for
  the worker's domain mirrors and the structured-output field contract. Kept in
  sync with the SQL schema via a contract test (`tests/test_model_contract.py`).
