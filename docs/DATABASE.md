# Database Architecture

> Source of truth: `supplier-to-shopify-enrichment-db.drawio` (Supabase / Postgres schema, Stage 1 vertical slice).

This document describes the Supabase (Postgres) schema backing the supplier → Shopify enrichment workflow. It covers the domain tables, the job queue, run/trace records, and configuration tables, plus the relationships between them.

See `ARCHITECTURE.md` for how these tables are used by the application and worker.

---

## 1. Schema overview

Nine tables, grouped by role:

| Group | Tables |
|-------|--------|
| **Ingestion & domain** | `batches`, `supplier_rows`, `products`, `variants`, `enriched_fields` |
| **Processing** | `jobs` (work queue), `runs` (execution traces) |
| **Configuration** | `settings`, `prompt_versions` |

Every table has a `id` primary key and `created_at` / `updated_at` timestamps unless noted.

---

## 2. Entity-relationship diagram

```
batches
  │ 1
  ├──< supplier_rows          (supplier_rows.batch_id → batches.id)
  │ 1
  ├──< products               (products.batch_id → batches.id)
  │ 1
  └──< jobs                   (jobs.batch_id → batches.id)

products
  │ 1
  ├──< variants               (variants.product_id → products.id)
  │ 1
  ├──< enriched_fields        (enriched_fields.product_id → products.id)
  │ 1
  ├──< jobs                   (jobs.product_id → products.id)
  │ 1
  └──< runs                   (runs.product_id → products.id)

supplier_rows
  │ 1
  └──< variants               (variants.supplier_row_id → supplier_rows.id)

variants
  │ 1
  └──< enriched_fields        (enriched_fields.variant_id → variants.id)

jobs
  │ 1
  └──< runs                   (runs.job_id → jobs.id)
```

All relationships are one-to-many (`1 ──< many`), expressed as foreign keys on the "many" side.

---

## 3. Tables

### 3.1 `batches`

One row per uploaded supplier file. The root of the ingestion hierarchy.

| Column | Notes |
|--------|-------|
| `id` (PK) | |
| `name` | |
| `source_format` | `csv` \| `xlsx` |
| `status` | `uploaded` \| `clustering` \| `enriching` \| `done` |
| `created_at` | |
| `updated_at` | |

### 3.2 `supplier_rows`

The raw, unmodified rows parsed from the uploaded file — the thin, messy supplier input before enrichment. Many rows may map to a single product.

| Column | Notes |
|--------|-------|
| `id` (PK) | |
| `batch_id` (FK → `batches.id`) | |
| `row_id` | the row identifier from the source CSV/XLSX |
| `product_name` | raw supplier name |
| `supplier_sku` | |
| `barcode` | often missing in supplier data |
| `supplier_notes` | |
| `unit_price` | |
| `created_at` | |
| `updated_at` | |

### 3.3 `products`

A normalized product, formed by clustering one or more `supplier_rows`. The unit a reviewer approves and publishes.

| Column | Notes |
|--------|-------|
| `id` (PK) | |
| `batch_id` (FK → `batches.id`) | |
| `status` | `queued` \| `enriching` \| `enriched` \| `approved` \| `published` |
| `created_at` | |
| `updated_at` | |

### 3.4 `variants`

A size/color variant under a product, linked back to the specific supplier row it came from.

| Column | Notes |
|--------|-------|
| `id` (PK) | |
| `product_id` (FK → `products.id`) | |
| `supplier_row_id` (FK → `supplier_rows.id`) | source row for this variant |
| `size` | |
| `color` | |
| `position` | ordering within the product |
| `created_at` | |
| `updated_at` | |

### 3.5 `enriched_fields`

The AI's output, stored one row per field so that value, confidence, provenance, and review status are tracked independently. Attached to a product and/or a specific variant.

| Column | Notes |
|--------|-------|
| `id` (PK) | |
| `product_id` (FK → `products.id`) | always set — every field belongs to a product |
| `variant_id` (FK → `variants.id`) | **nullable**: `null` for product-scoped fields (e.g. `title`, `description`, `vendor`); set for variant-scoped fields (e.g. per-variant `barcode`, `weight`) |
| `field_name` | `title` \| `description` \| `vendor` \| … |
| `value` | the enriched value |
| `confidence` | model confidence score |
| `source` | `llm` \| `web` \| `manual` |
| `status` | `ai` \| `accepted` \| `overridden` |
| `created_at` | |
| `updated_at` | |

This per-field design is what powers the review workspace: every field surfaces *what* the AI produced, *how confident* it is, *where it came from*, and *whether a human has accepted or overridden it*.

### 3.6 `jobs`

The durable work queue between the BFF API and the Python worker. Consumed with `SELECT … FOR UPDATE SKIP LOCKED`.

| Column | Notes |
|--------|-------|
| `id` (PK) | |
| `type` | `cluster_batch` \| `enrich_product` |
| `status` | `queued` \| `processing` \| `done` \| `failed` |
| `product_id` (FK → `products.id`) | nullable; set for product-level jobs |
| `batch_id` (FK → `batches.id`) | nullable; set for batch-level jobs |
| `payload` | job input |
| `error` | failure detail |
| `attempts` | retry counter |
| `created_at` | |
| `updated_at` | |

### 3.7 `runs`

One row per enrichment execution — the observability/trace record for a job. Captures graph version, node-level traces, model usage, and latency.

| Column | Notes |
|--------|-------|
| `id` (PK) | |
| `product_id` (FK → `products.id`) | |
| `job_id` (FK → `jobs.id`) | |
| `graph_version` | version of the LangGraph graph |
| `status` | `success` \| `partial` \| `failed` |
| `node_traces` | per-node execution trace |
| `model` | LLM model used |
| `prompt_version` | prompt version applied |
| `input_tokens` | |
| `output_tokens` | |
| `latency_ms` | |
| `created_at` | |
| `updated_at` | |

### 3.8 `settings`

Global enrichment configuration consumed by the worker.

| Column | Notes |
|--------|-------|
| `id` (PK) | |
| `title_template` | e.g. `[{token:'Brand'},{token:'Size'},{token:'Name'}]` |
| `default_model` | default LLM model |
| `guardrail_config` | guardrail configuration |
| `created_at` | |
| `updated_at` | |

### 3.9 `prompt_versions`

Versioned, named prompts so enrichment runs are reproducible and prompts can be evaluated/rolled forward.

| Column | Notes |
|--------|-------|
| `id` (PK) | |
| `name` | `enrich_product` \| `cluster` \| … |
| `version` | |
| `content` | the prompt body |
| `is_active` | whether this version is currently used |
| `created_at` | |
| `updated_at` | |

---

## 4. Design notes

- **Raw vs. enriched separation.** `supplier_rows` preserves the original input verbatim; enrichment never mutates it. Normalized output lives in `products` / `variants` / `enriched_fields`, so the system can always show provenance and re-run enrichment from clean inputs.
- **Field-level enrichment.** Storing each enriched value as its own row (with confidence, source, and review status) is what makes the reviewer fast and confident, and lets human overrides coexist with AI values.
- **Queue in the database.** `jobs` is a Postgres-backed queue (`FOR UPDATE SKIP LOCKED`), avoiding an extra broker while supporting concurrent workers, retries (`attempts`), and durable failure capture (`error`).
- **Reproducibility & observability.** `runs` + `prompt_versions` + `settings.guardrail_config` together record exactly which graph version, model, and prompt produced any field, supporting tracing and Promptfoo-based evaluation.
- **Access control (RLS + grants).** RLS is enabled on every table so nothing is reachable by default with the anon key (`..._rls_policies.sql`). The BFF goes through PostgREST as `service_role`, which also requires table-level `GRANT`s — these live in `..._grants.sql` (full DML for `service_role`; `select` on `products` + `enriched_fields` for `anon`/`authenticated`, matching the Realtime read policies). The Python worker connects as the `postgres` superuser over `DATABASE_URL` and is unaffected by either.
