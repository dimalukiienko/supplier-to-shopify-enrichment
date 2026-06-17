# Handoff — Supplier → Shopify Enrichment

Status snapshot for the next engineer/agent picking up this repo.

- **Branch:** `feat/bff-and-reviewer-ui` (built on the merged worker core)
- **Stage:** Stage 1 vertical slice (`enrich → human review → publish`)
- **Current state:** the full slice now runs end-to-end — monorepo foundation,
  the **enrichment worker core**, **and the BFF API + reviewer UI** are
  implemented and verified. A reviewer can upload a CSV, watch products enrich
  live, accept/override fields, and approve → push (Shopify mocked).

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

### Worker — enrichment core (`apps/worker`) — **implemented**
The full job → cluster → enrich → persist path runs end-to-end:
- **Infra modules:** `db.py` (psycopg, dict-row connection for the
  `FOR UPDATE SKIP LOCKED` queue claim), `llm.py` (OpenAI JSON-mode wrapper — the
  single LLM seam, returns token/latency telemetry), `research.py` (web-research
  seam, **no-op in Stage 1**), `normalize.py` (size/cluster helpers).
- **Pipeline:** `preprocess.py` clusters supplier rows into products + size
  variants (keys off the size-stripped SKU) and enqueues one `enrich_product` job
  per product; `fetch.py` builds `GraphState`; `persist.py` writes
  `enriched_fields` (idempotent — replaces AI rows, keeps reviewer edits) + a
  `runs` record and flips product/batch status.
- **Graph:** `graph/builder.py` compiles a real LangGraph `StateGraph`
  (`parse → research → draft → validate → assemble`); nodes in `graph/nodes.py`
  produce title (rule-composed from `settings.title_template`), description,
  vendor, product_type, tags, and SEO fields with per-field confidence/source,
  recording per-node traces to `runs.node_traces`.
- **Poller:** `poller.py::run_forever` claims jobs atomically, dispatches by type,
  marks done/failed (`attempts`/`error`), and supports a `WORKER_DRAIN=true`
  one-shot mode.
- **Verified:** `ruff` + `mypy --strict` + `pytest` (18 tests incl. schema
  contract, clustering, and a stubbed-LLM graph run) all green, plus a live
  OpenAI end-to-end run on the sample CSV.

### Web tier — BFF API + reviewer UI (`apps/web`) — **implemented**
The full reviewer slice runs against the worker output:
- **BFF route handlers** (`apps/web/src/app/api/`): `batches` GET/POST (upload a
  CSV → insert batch + supplier_rows → enqueue `cluster_batch`; replaces the
  dev-only `seed_batch.py`), `batches/[id]/products` GET, `products/[id]` GET
  (product + variants + fields + latest run), `products/[id]/fields/[fieldId]`
  PATCH (accept/override), `approve`, `push` (**mocked** Shopify), `retry`
  (re-enqueue enrich), and `settings` GET/PUT. All go through `service_role`;
  request bodies validated with `zod` (`src/lib/schemas.ts`, `src/lib/api.ts`).
- **Reviewer UI** (`apps/web/src/app`): batches dashboard + upload form; batch
  view with **live** status via Supabase Realtime (`BatchLive`); product review
  page with per-field accept/override (`FieldRow`), variant table, and live
  field streaming (`ReviewLive`); approve → push controls; settings editor.
  Server Components read **only** through the BFF (`src/lib/bff.ts`); the browser
  touches Supabase directly only for Realtime (anon key).
- **DB access fix:** added `..._grants.sql` — RLS alone is not enough; PostgREST
  needs table `GRANT`s for `service_role` (BFF) and `anon` (Realtime). The worker
  (direct `postgres` connection) never needed them, so this surfaced here.
- **Verified:** `pnpm turbo run lint type-check build` green, no type drift;
  end-to-end against local Supabase + a live worker drain (113-row sample CSV →
  93 products enriched; accept/override/approve/push and settings all exercised;
  reviewer edits survive re-enrichment).

---

## What remains to be done (Stage 1)

The worker core and the BFF + reviewer UI are done (above); these are the
remaining pieces.

### Web tier follow-ups (post-slice, optional)
- **Duplicate field rows after re-enrichment.** `persist.py` deletes only
  `status='ai'` rows and re-inserts the fresh AI draft, so a field that was
  accepted/overridden then re-enriched shows **two** rows (the locked reviewer
  value + a new `ai` suggestion). The review page renders both. Decide the UX —
  skip re-drafting reviewer-locked fields in the worker, or collapse/dedupe per
  `field_name` in the BFF/UI.
- **XLSX upload.** The upload route accepts `.csv` only; `.xlsx` 415s. The sample
  has a CSV twin, so this was deferred to stay in the timebox.
- **Variant-grouping fixes.** The review page shows variants read-only; editing
  the grouping is not built.

### Worker follow-ups (post-core, optional)
- **Real web research:** `research.py::research_facts` is a no-op; wiring a search
  tool would let thin rows ground brand/specs/barcode as `source="web"`. The
  guardrail + `source` plumbing already supports it.
- **Vendor for SKU-only brands:** when the brand lives only in the SKU prefix
  (e.g. `RAP-` = Rapala) the LLM emits the raw prefix; a brand-code map or web
  research would fix it. Reviewer-correctable meanwhile.
- **Concurrency/retries:** the claim is `SKIP LOCKED`-safe for multiple workers,
  but there is no retry/backoff policy on `failed` jobs yet.

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
- Field-level priority: the worker already drafts Title, Description,
  Vendor/brand, Product type, Tags, and size-based Variants (the "Built" rows in
  `docs/ARCHITECTURE.md` §"Field-level build-vs-defer scope"); surface those same
  fields first in the reviewer UI.
- The frontend must talk **only** to the BFF — never the DB or worker directly.
- SQL migrations are the **single source of truth**; never hand-edit
  `types.gen.ts` (regenerate) and keep Pydantic models passing the contract test.
- LLM provider: the worker uses **OpenAI** today (set `OPENAI_API_KEY` in `.env`).
  All model calls go through `apps/worker/src/worker/llm.py`, so switching to
  Anthropic is confined to that module. `WorkerConfig` reads the **repo-root**
  `.env` regardless of CWD.

## Getting oriented quickly

```bash
task setup            # .env + installs + local Supabase up/migrated + types (needs Docker)
task check            # full pre-PR gate (mirrors CI)

# Try the worker end-to-end (needs OPENAI_API_KEY in .env):
task db:reset         # clean DB + seed settings/prompts
task worker:seed-batch  # load data/products_input.csv → batch + rows + cluster job
task worker:drain     # run the worker once, draining the queue, then exit

task dev              # web (http://localhost:3000) + worker (long-running)
```

Supabase Studio: http://127.0.0.1:54323 once the local stack is up.
