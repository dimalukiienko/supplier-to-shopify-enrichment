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

## 2. Initialize Supabase and run migrations

This repo already contains the Supabase CLI project under `supabase/`, so you do
not need to run `supabase init`.

### Local database

```bash
# From the repo root:
supabase start
supabase db reset
```

1. `supabase start` boots local Postgres and prints the local API URL plus the
   anon and service role keys.
2. Copy those printed values into `.env` as `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Set `DATABASE_URL` to the local Postgres connection string printed by
   `supabase start`.
4. `supabase db reset` applies every migration in `supabase/migrations/`, then
   loads `supabase/seed.sql`.

Supabase Studio is available at http://127.0.0.1:54323 after `supabase start`.

### Linked remote project

Use this flow when you want to apply the committed migrations to a hosted
Supabase project.

```bash
# Authenticate the CLI once per machine.
supabase login

# Link this repo to the hosted Supabase project once.
supabase link --project-ref <project-ref>

# Push local migrations to the linked remote project.
pnpm db:migrate
```

1. Create or choose a Supabase project in the Supabase dashboard.
2. Copy its project ref from the dashboard URL or project settings.
3. Run `supabase link --project-ref <project-ref>` from the repo root.
4. Run `pnpm db:migrate`, which calls `supabase db push` and applies the local
   migrations to the linked remote project.

For non-interactive environments, set `SUPABASE_ACCESS_TOKEN` instead of running
`supabase login`.

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
supabase start                         # start local Supabase services
supabase db reset                      # re-apply all local migrations + seed
supabase link --project-ref <ref>      # link this repo to a hosted project
pnpm db:migrate                        # push migrations to the linked remote project
supabase migration new <name>          # create a new migration

# --- Evals ---
npx promptfoo@latest eval -c evals/promptfooconfig.yaml
```

> `pnpm db:migrate` runs `supabase db push`, which targets the hosted project
> linked with `supabase link --project-ref <ref>`.

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
