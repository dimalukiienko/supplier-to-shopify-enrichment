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
| Docker | — | required to run the local Supabase stack |

> The [Supabase CLI](https://supabase.com/docs/guides/cli) is **not** a global
> install — it ships as a pinned dev dependency (`supabase` in the root
> `package.json`). `pnpm install` provides it, and every command in this README
> invokes it as `pnpm exec supabase …` so everyone uses the same CLI version.

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
  `pnpm exec supabase start` (see below).
- `SUPABASE_SERVICE_ROLE_KEY` — also from `pnpm exec supabase start`; used by the
  BFF and the worker (both bypass RLS).
- `DATABASE_URL` — direct Postgres connection for the worker's job poller.
- `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`) — LLM provider for the graph nodes.
- `WEB_SEARCH_API_KEY` — optional, for the `research` node.

## 2. Initialize Supabase and run migrations

This repo already contains the Supabase CLI project under `supabase/`, so you do
not need to run `supabase init`. Run all commands from the repo root.

### Local database

```bash
pnpm exec supabase start          # boot the local stack (needs Docker)
pnpm exec supabase db reset       # apply all migrations + seed.sql
```

1. `pnpm exec supabase start` boots local Postgres and prints the local API URL
   plus the anon and service role keys. Re-print them anytime with
   `pnpm exec supabase status`.
2. Copy those printed values into `.env` as `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Set `DATABASE_URL` to the local Postgres connection string printed by
   `pnpm exec supabase start`.
4. `pnpm exec supabase db reset` applies every migration in
   `supabase/migrations/`, then loads `supabase/seed.sql`.

Supabase Studio is available at http://127.0.0.1:54323 once the stack is up.
Stop the stack with `pnpm exec supabase stop` (add `--no-backup` to also drop
local data).

#### Changing the schema

Migrations under `supabase/migrations/` are the source of truth. To evolve the
schema:

```bash
pnpm exec supabase migration new <name>   # create an empty timestamped migration
# ...write SQL in the new file...
pnpm exec supabase db reset               # re-apply everything against a clean DB
pnpm --filter @repo/db gen:types          # regenerate TS types from the new schema
```

### Linked remote (cloud) project

Use this flow to apply the committed migrations to a hosted Supabase project.

```bash
pnpm exec supabase login                            # authenticate once per machine
pnpm exec supabase link --project-ref <project-ref> # link this repo to the project once
pnpm exec supabase db push                          # push local migrations to the remote
```

1. Create or choose a Supabase project in the Supabase dashboard.
2. Copy its project ref from the dashboard URL or project settings.
3. Run `pnpm exec supabase link --project-ref <project-ref>` from the repo root.
4. Run `pnpm exec supabase db push` (or the `pnpm db:migrate` alias) to apply the
   local migrations to the linked remote project. Check what is applied with
   `pnpm exec supabase migration list --linked`.

For non-interactive environments (CI, scripts), set `SUPABASE_ACCESS_TOKEN`
instead of running `pnpm exec supabase login`.

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

# --- Database: local (run from repo root) ---
pnpm exec supabase start               # start local Supabase services (needs Docker)
pnpm exec supabase stop                # stop local services
pnpm exec supabase status              # re-print local URL + anon/service keys
pnpm exec supabase db reset            # re-apply all local migrations + seed
pnpm exec supabase migration new <name># create a new migration
pnpm exec supabase migration list      # list local migrations

# --- Database: cloud / linked project ---
pnpm exec supabase login                     # authenticate the CLI once per machine
pnpm exec supabase link --project-ref <ref>  # link this repo to a hosted project
pnpm db:migrate                              # push migrations to the linked remote project
pnpm exec supabase migration list --linked   # compare local vs. remote migrations

# --- Evals ---
npx promptfoo@latest eval -c evals/promptfooconfig.yaml
```

> `pnpm db:migrate` runs `supabase db push`, which targets the hosted project
> linked with `pnpm exec supabase link --project-ref <ref>`.

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
