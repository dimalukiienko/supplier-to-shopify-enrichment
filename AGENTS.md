# Repository Instructions

## Project Context

This repository defines the supplier-to-Shopify enrichment workflow: thin supplier product data is normalized, enriched with AI, reviewed by a human, and then prepared for Shopify publishing.

Authoritative project docs:

- `docs/ARCHITECTURE.md` describes the Stage 1 application architecture and end-to-end enrichment flow.
- `docs/DATABASE.md` describes the Supabase/Postgres schema, queue tables, traces, settings, and relationships.
- `docs/architecture.drawio` is the editable architecture diagram.
- `data/products_input.csv` and `data/products_input.xlsx` are the sample supplier inputs.

## When To Read Docs

- Read `docs/ARCHITECTURE.md` before changing module boundaries, system flow, worker behavior, review workflow, Shopify publishing behavior, or external-service responsibilities.
- Read `docs/DATABASE.md` before changing schemas, migrations, query behavior, enrichment persistence, product/variant modeling, job queue logic, or trace/run records.
- Check `docs/architecture.drawio` when architecture documentation and diagrams need to stay aligned.

## Current Implementation State

- The repository contains the monorepo **foundation**: workspace tooling, app/package scaffolds, Supabase migrations, and CI — but business logic (graph nodes, BFF handlers, review UI) is still stubbed.
- Structure and conventions are documented in `docs/MONOREPO.md`:
  - `apps/web` — Next.js (App Router) frontend + BFF route handlers. See [`apps/web/README.md`](apps/web/README.md).
  - `apps/worker` — Python + LangGraph enrichment worker (uv-managed); graph/pipeline/poller bodies are stubs. See [`apps/worker/README.md`](apps/worker/README.md).
  - `packages/db` — `@repo/db`: generated Supabase TS types + domain aliases.
  - `packages/config-ts`, `packages/config-eslint` — shared TS/ESLint config.
  - `supabase/` — migrations (the schema source of truth) + `seed.sql`.
- When adding implementation, follow the stack described in `docs/ARCHITECTURE.md` and the conventions in `docs/MONOREPO.md` unless the user explicitly changes direction.

## Development Rules

- Keep changes scoped to the user's request.
- Preserve source-of-truth documentation when adding code: update `docs/ARCHITECTURE.md` or `docs/DATABASE.md` if implementation decisions change the documented architecture or schema.
- Keep generated or local AI-work history under `docs/ai-work-history/` unless the user asks to modify it.
- Do not mutate sample data files unless the task is specifically about input data or fixtures.

## Validation

- For documentation-only changes, review Markdown rendering and links.
- JS/TS (root): `pnpm install`, then `pnpm turbo run lint type-check build`.
- Supabase TS types: `pnpm --filter @repo/db gen:types` (CI fails on drift vs the committed `types.gen.ts`).
- Worker (from `apps/worker`): `uv sync`, then `uv run ruff check .`, `uv run mypy`, `uv run pytest` (pytest includes the model↔schema contract test).
- Migrations: `supabase start && supabase db reset` applies all migrations + `seed.sql` against a clean local DB.
- CI (`.github/workflows/ci.yml`) runs the JS, schema/type-drift, and worker checks on every PR.
