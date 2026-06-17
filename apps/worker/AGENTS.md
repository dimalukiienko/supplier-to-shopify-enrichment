# Worker App Instructions

Standalone Python + LangGraph enrichment worker (uv-managed). See
[`README.md`](README.md) for the stack, layout, and dev commands, and
`docs/ARCHITECTURE.md` §5 for the worker's role. For repo-wide rules, see the
root [`../../AGENTS.md`](../../AGENTS.md).

## Conventions

- The hand-written Pydantic models in `src/worker/models/` are the source of
  truth for the worker's domain mirrors and the LLM structured-output contract.
  Keep `tests/test_model_contract.py` green — it asserts field/enum parity
  against the migration SQL, so models can't silently drift.
- Runtime-decoupled from `web`: reach Supabase via the `jobs` queue, never
  import from `apps/web`.

## Validation

From `apps/worker`:

- `uv sync`
- `uv run ruff check .`
- `uv run mypy`
- `uv run pytest` (includes the model↔schema contract test)
