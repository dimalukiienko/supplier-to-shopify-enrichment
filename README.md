# Supplier → Shopify Enrichment

Takes thin, messy supplier rows and produces structured, publish-ready Shopify
product listings that a human reviewer inspects, corrects, and approves before
publishing. This repo is the **Stage 1 vertical slice**: the core
`enrich → human review → publish` loop.

- **Architecture:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Database schema:** [`docs/DATABASE.md`](docs/DATABASE.md)
- **Monorepo conventions:** [`docs/MONOREPO.md`](docs/MONOREPO.md)

## Layout

```
apps/
  web/        Next.js (App Router): reviewer UI + BFF route handlers
  worker/     Python + LangGraph enrichment worker (uv-managed)
packages/
  db/         @repo/db — generated Supabase TS types + domain aliases
  config-ts/  shared tsconfig presets
  config-eslint/ shared ESLint config
supabase/     Supabase CLI project: migrations (schema source of truth) + seed
evals/        Promptfoo configs + datasets
data/         sample supplier inputs
```

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | see `.node-version` |
| pnpm | 11+ | JS workspace package manager |
| Python | 3.12+ | worker runtime |
| [uv](https://docs.astral.sh/uv/) | latest | Python dependency manager |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | latest | local Postgres + migrations |
| Docker | — | required by the Supabase CLI |

## 1. Initialize

```bash
# Clone, then from the repo root:
cp .env.example .env            # fill in keys (see below)

# JS workspace (web app + shared packages)
pnpm install

# Python worker
cd apps/worker && uv sync && cd ../..
```

### Environment variables

Copy `.env.example` to `.env` and set:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — printed by
  `supabase start` (see below).
- `SUPABASE_SERVICE_ROLE_KEY` — also from `supabase start`; used by the BFF and
  the worker (both bypass RLS).
- `DATABASE_URL` — direct Postgres connection for the worker's job poller.
- `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`) — LLM provider for the graph nodes.
- `WEB_SEARCH_API_KEY` — optional, for the `research` node.

## 2. Start the database

```bash
supabase start          # boots local Postgres, prints the URL + anon/service keys
supabase db reset       # applies all migrations in supabase/migrations + seed.sql
```

`supabase start` prints the values for the Supabase env vars above. Supabase
Studio is available at http://127.0.0.1:54323.

## 3. Run

```bash
# Web app (reviewer UI + BFF) — http://localhost:3000
pnpm --filter @repo/web dev

# Enrichment worker (drains the jobs queue) — in a second terminal
cd apps/worker && uv run worker
```

> The graph nodes, BFF handlers, and review UI are scaffolded but still stubbed
> in this Stage 1 slice — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for
> what is built vs. deferred.

## Common commands

```bash
# --- JS / TS (run from repo root) ---
pnpm turbo run lint type-check build   # all JS checks
pnpm --filter @repo/web dev            # dev server
pnpm --filter @repo/db gen:types       # regenerate Supabase TS types

# --- Worker (run from apps/worker) ---
uv run worker                          # start the poller
uv run pytest                          # tests (incl. model↔schema contract)
uv run ruff check . && uv run mypy     # lint + type-check

# --- Database ---
pnpm db:migrate                        # push migrations to the linked remote project
supabase migration new <name>          # create a new migration
supabase db reset                      # re-apply all migrations + seed

# --- Evals ---
npx promptfoo@latest eval -c evals/promptfooconfig.yaml
```

> `pnpm db:migrate` runs `supabase db push`, which targets a **linked** project.
> Link it once first: `supabase link --project-ref <ref>` (with
> `SUPABASE_ACCESS_TOKEN` set).

## Type safety & schema

The SQL migrations under `supabase/` are the single source of truth for the
schema. TypeScript types are generated from them into `@repo/db`
(`pnpm --filter @repo/db gen:types`), and the worker's Pydantic models are kept
in sync by a contract test. See [`docs/MONOREPO.md`](docs/MONOREPO.md#type-loading)
for details.

## CI

`.github/workflows/ci.yml` runs on every PR: JS lint/type-check/build, a
Supabase migration apply + TS type-drift check, and the worker's
lint/type-check/test suite.
