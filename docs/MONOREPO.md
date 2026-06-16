# Monorepo Conventions

Foundation for the supplier → Shopify enrichment workflow. See `ARCHITECTURE.md`
and `DATABASE.md` for the system and schema design this structure implements.

## Layout

```
apps/
  web/        Next.js (App Router): frontend + BFF route handlers (app/api/*)
  worker/     Python + LangGraph enrichment worker (uv-managed)
packages/
  db/         @repo/db — generated Supabase TS types + domain aliases
  config-ts/  shared tsconfig presets
  config-eslint/ shared flat ESLint config
supabase/     Supabase CLI project: config.toml, migrations/, seed.sql
evals/        Promptfoo configs + datasets
data/ docs/ scripts/   sample inputs, docs, AI-work hooks (pre-existing)
```

- **apps/** = deployable units, **packages/** = shared libraries (standard
  Turborepo split). The Python worker lives in `apps/worker` for atomic
  cross-cutting PRs but is fully decoupled at runtime — it reaches Supabase via
  the `jobs` queue, never `apps/web`.
- **supabase/** sits at the root because the schema is shared infrastructure for
  both `web` and `worker`.

## Tooling

- **JS/TS:** pnpm workspaces + Turborepo. Root scripts (`pnpm build|lint|type-check|dev`)
  fan out via `turbo.json`.
- **Python:** uv (`apps/worker/pyproject.toml`). Run worker tasks with
  `uv run` from `apps/worker`.

## Migrations (Supabase)

- Authored as raw SQL under `supabase/migrations/`, named
  `<UTC-timestamp>_<description>.sql` via `supabase migration new`.
- **Forward-only:** never edit a merged migration; fix with a new one.
- Local loop: `supabase start` → `supabase migration new` → write SQL →
  `supabase db reset` (replays all migrations + `seed.sql` on a clean DB).
- CI proves migrations apply from scratch and that generated types match
  (`.github/workflows/ci.yml`).

## Type loading

SQL migrations are the **single source of truth** for the schema.

- **Next.js:** `supabase gen types` → `packages/db/src/types.gen.ts` (generated,
  do not edit). Domain aliases (`EnrichedField`, `ProductStatus`, …) are layered
  in `packages/db/src/index.ts`. Regenerate with
  `pnpm --filter @repo/db gen:types`; CI fails on drift (`git diff --exit-code`).
- **Python worker:** hand-written Pydantic models in
  `apps/worker/src/worker/models/` are the source of truth for domain mirrors
  and the LLM structured-output contract. A contract test
  (`tests/test_model_contract.py`) asserts field/enum parity against the
  migration SQL, so the models can't silently drift.

## Common commands

```bash
pnpm install                          # install JS workspace
pnpm turbo run lint type-check build  # JS checks
pnpm --filter @repo/db gen:types      # regenerate Supabase TS types

cd apps/worker && uv sync             # install worker
uv run pytest                         # worker tests (incl. schema contract)
uv run ruff check . && uv run mypy    # worker lint + types

supabase start && supabase db reset   # apply migrations + seed locally
pnpm db:migrate                       # push migrations to the linked remote (supabase db push)
```
