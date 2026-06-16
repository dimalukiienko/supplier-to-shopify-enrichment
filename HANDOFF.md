# Handoff — Supplier → Shopify Enrichment

Status snapshot for the next engineer/agent picking up this repo.

- **Branch:** `feat/monorepo-foundation`
- **Stage:** Stage 1 vertical slice (`enrich → human review → publish`)
- **Current state:** monorepo **foundation is complete and CI-green**; business logic is **scaffolded but stubbed**.

Read first: `docs/ARCHITECTURE.md` (flow + built-vs-deferred), `docs/DATABASE.md`
(schema source of truth), `docs/MONOREPO.md` (conventions). This file only
summarizes status — those docs are authoritative.

---

## What has been done

### Tooling & workspace
- pnpm + Turborepo JS workspace; uv-managed Python worker.
- `Taskfile.yml` is the entry point for onboarding/dev (`task setup`, `task dev`,
  `task check`, etc. — see README "Tasks").
- Shared config packages: `@repo/config-ts`, `@repo/config-eslint`.
- `.env.example` documents all env vars; `task setup` auto-populates local
  Supabase URL/keys/`DATABASE_URL`.
- CI (`.github/workflows/ci.yml`) runs JS lint/type-check/build, Supabase
  migration apply + TS type-drift check, and worker lint/type-check/pytest on
  every PR. `task check` mirrors it locally.

### Database (source of truth = SQL migrations)
- Migrations under `supabase/migrations/` are complete for Stage 1: domain
  tables, processing/queue tables, config/settings, Realtime enablement, and RLS
  policies. `supabase/seed.sql` seeds local data.
- `task db:reset` applies all migrations + seed against a clean local DB.

### Type safety
- `@repo/db` (`packages/db`) holds generated Supabase TS types
  (`types.gen.ts`) + domain aliases; regenerated via `task gen:types`
  (CI fails on drift).
- Worker Pydantic models (`apps/worker/src/worker/models/`) are kept in sync with
  the schema by a contract test (`tests/test_model_contract.py`).

### Apps — scaffolded only
- **`apps/web`** (Next.js App Router): layout, placeholder home page, Supabase
  browser/server clients, and a working `GET /api/health` route. Reviewer UI and
  most BFF route handlers are **not built**.
- **`apps/worker`** (Python + LangGraph): package structure, config, models, and
  graph/pipeline/poller module skeletons exist. All execution bodies are stubs.

---

## What remains to be done (Stage 1)

These are the stubbed pieces that make up the actual vertical slice.

### Worker — enrichment graph (`apps/worker/src/worker/`)
All raise `NotImplementedError`:
- **`graph/nodes.py`** — `parse`, `research`, `draft`, `validate`, `assemble`.
- **`graph/builder.py`** — wire the nodes into the LangGraph.
- **`pipeline/`** — `fetch.py`, `preprocess.py`, `persist.py` bodies.
- **`poller.py`** — the `run_forever` claim/process loop
  (`CLAIM_JOB_SQL` with `FOR UPDATE SKIP LOCKED` is already drafted as a
  reference query; the loop around it is the work).

### BFF — Next.js route handlers (`apps/web/src/app/api/`)
Only `health` exists. Still needed (see `docs/ARCHITECTURE.md` §3):
- `batches` / `products` / `fields` — CRUD + listing; upload enqueues jobs.
- `approve / push` — records approval, initiates Shopify push (**mocked** in
  Stage 1, path wired but does not hit live Shopify).
- `settings` — read/write enrichment + prompt config.

### Reviewer UI (`apps/web/src/app`)
- Batch upload & management (status via Realtime; retry failed products).
- Product review page: per-field accept/override, variant-grouping fixes,
  approve/push.
- Settings view.
- Live updates wired to Supabase Realtime on `enriched_fields` / `products.status`.

### Evals
- `evals/` has Promptfoo config scaffold; datasets/assertions not built out.

---

## Scope boundaries (don't accidentally build these)

Explicitly **deferred / mocked** in Stage 1 (per `docs/ARCHITECTURE.md`):
- **Shopify Admin API** — mocked; approve/push does not hit live Shopify.
- Fields **deferred**: Collections, product media/exact-variant images,
  variants-by-color (schema-ready via `variants.color` but dataset is size-only).
- SEO meta title/description — **partial** (drafted, lightly validated).
- Later-stage UIs: prompt-management UI, agent/observability UI.
- Filter/search across products.

If an implementation decision changes the documented architecture or schema,
update `docs/ARCHITECTURE.md` / `docs/DATABASE.md` in the same change.

---

## Time constraints & notes

- This is a **timeboxed Stage 1 slice** — the deferral list above exists to fit
  the timebox, not because the pieces are unimportant. Prefer a working
  end-to-end thin slice over breadth.
- Field-level priority: build Title, Description, Vendor/brand, Product type,
  Tags, and size-based Variants first (the "Built" rows in
  `docs/ARCHITECTURE.md` §"Field-level build-vs-defer scope").
- The frontend must talk **only** to the BFF — never the DB or worker directly.
- SQL migrations are the **single source of truth**; never hand-edit
  `types.gen.ts` (regenerate) and keep Pydantic models passing the contract test.
- LLM provider is configurable: set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in
  `.env` before running the worker.

## Getting oriented quickly

```bash
task setup     # .env + installs + local Supabase up/migrated + types (needs Docker)
task dev       # web (http://localhost:3000) + worker
task check     # full pre-PR gate (mirrors CI)
```

Supabase Studio: http://127.0.0.1:54323 once the local stack is up.
