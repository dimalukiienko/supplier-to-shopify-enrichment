# Application Architecture

> Source of truth: `supplier-to-shopify-enrichment.drawio` (Stage 1 vertical slice).

This document describes the application architecture for the **supplier → Shopify enrichment** workflow: a system that takes thin, messy supplier rows and produces structured, publish-ready Shopify product listings that a human reviewer inspects, corrects, and approves before publishing.

The scope shown here is the **Stage 1 vertical slice** — the core `enrich → human review → publish` loop. Components that are mocked, stubbed, or sketched for later stages are called out explicitly.

---

## 1. High-level overview

The system is organized into six layers:

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Frontend** | Next.js | Reviewer-facing UI: batch upload, product review, approve/push, settings |
| **BFF API** | Next.js route handlers | Backend-for-frontend; thin API over Supabase, enqueues work |
| **Data layer** | Supabase (Postgres) | Tables, job queue, run/trace records, settings, Realtime |
| **Enrichment worker** | Python + LangGraph | Polls the job queue and runs the enrichment graph |
| **External** | OpenAI, Tavily web research | LLM calls (incl. vision image verification); web research grounds vendor, barcode, physical specs + verified product/variant images (`source = web`) |
| **Mocked (Stage 1)** | Shopify Admin API | Publishing — approve/push wired but does not hit live Shopify |
| **Evals & observability** | Promptfoo, LangGraph tracing | Prompt/graph evaluation and run tracing |

The control flow is: a **human actor** uploads a batch and reviews products in the Next.js app → the **BFF API** persists data to Supabase and enqueues jobs → the **Python worker** picks up jobs, runs the **LangGraph** enrichment pipeline, and persists results → **Supabase Realtime** streams updates back to the UI → the reviewer **approves and pushes** approved products to Shopify (mocked).

---

## 2. Frontend — Next.js

The reviewer-facing surface. Key views:

- **Batch upload & management** — upload a supplier file (CSV / XLSX), view existing batches, and track per-product enrichment progress via the `batches.status` / `products.status` fields streamed over Realtime. Failed products can be **re-run/retried** (backed by `jobs.attempts` / `jobs.error`). Filter/search across products is sketched for later stages.
- **Product review workspace** — the core screen: inspect every AI-produced field with its value, confidence, and provenance; edit or override any field; confirm or fix variant grouping.
- **Approve / push** — approve a reviewed product and trigger the push to Shopify.
- **Settings** — configure the title-format rules (`settings.title_template`), the default model (`settings.default_model`), and guardrail/validation settings (`settings.guardrail_config`).

Sketched for later stages (not part of the Stage 1 slice):

- **Prompt-management UI** — manage prompt versions.
- **Agent / observability UI** — inspect runs, traces, and graph behavior.

The frontend talks only to the BFF API; it does not access the database or worker directly.

### State & data-fetching

- **App Router with Server Components** for initial loads — batch lists and the product-review page are server-rendered, reading through the BFF so the database schema stays behind the API.
- **Client-side mutations** — field edits (accept / override), variant-grouping fixes, and approve/push are client interactions that `POST` to BFF route handlers; the page revalidates the affected resource on success.
- **Live updates via Supabase Realtime** — the review workspace subscribes to `enriched_fields` (and `products.status`) changes, so fields stream in and product status flips as the worker completes work, without manual refresh. (See §4 for the Realtime mechanism.)

---

## 3. BFF API — Next.js route handlers

A thin backend-for-frontend layer implemented as Next.js route handlers. It exposes the API surface the frontend needs and owns writes to Supabase:

- **`batches` / `products` / `fields`** — CRUD and listing for batches, products, and enriched fields; uploading a batch enqueues clustering/enrichment work onto the `jobs` queue.
- **`approve / push`** — records reviewer approval and initiates the push to Shopify (mocked in Stage 1).
- **`settings`** — reads/writes enrichment settings and prompt configuration.

The BFF keeps the frontend decoupled from the database schema and the worker, and is the single place where work is enqueued.

---

## 4. Data layer — Supabase

Supabase (Postgres) is the system's backbone, serving four roles. See `DATABASE.md` for the full schema.

- **Domain tables** — `batches`, `supplier_rows`, `products`, `variants`, `enriched_fields`.
- **Job queue** — the `jobs` table is used as a durable work queue between the BFF and the worker.
- **Run / trace records** — `runs` (with per-node traces in `runs.node_traces`) capture each enrichment execution for observability.
- **Settings & prompts** — `settings` and `prompt_versions` configure model, guardrails, title rules, and versioned prompts.
- **Realtime** — Supabase Realtime pushes row changes (e.g. newly persisted `enriched_fields`) to the UI so the review workspace updates live as the worker completes products.

---

## 5. Enrichment worker — Python

A standalone Python worker that performs the actual enrichment. It is decoupled from the web tier via the `jobs` queue.

### 5.1 Job poller

The worker pulls work with `SELECT … FOR UPDATE SKIP LOCKED`, allowing multiple worker instances to process the queue concurrently without double-processing a job.

Model calls are made resilient to the provider's tokens-per-minute budget at two levels: the OpenAI client retries each call with exponential backoff (honouring the rate-limit reset headers; `OPENAI_MAX_RETRIES`, default 8), and a transient failure that still surfaces — rate-limit saturation or a brief upstream/network blip — returns the job to the queue (resetting its position) to be retried later rather than failing it. A job fails for good only on a non-transient error or once it has exhausted `MAX_ATTEMPTS` (default 5).

### 5.2 Processing pipeline

For each job the worker runs the following stages:

1. **Preprocessing** — normalize fields, strip size tokens, and cluster scattered supplier rows that represent the same product into one product with variants.
2. **Fetch** — load the inputs it needs: `products`, `variants`, `supplier_rows`, `settings`, and `prompt_versions`.
3. **LangGraph graph** — the enrichment pipeline:
   `parse → research → draft → validate → assemble`. The `parse` and `draft` nodes call the model in **structured-output (JSON-schema) mode**, so every field is returned against a fixed contract carrying `value`, `confidence`, and `source` — which is exactly what is persisted per row into `enriched_fields`. The `research` node calls a **web/search tool** to look up brand, specs, and barcode for thin rows; grounded facts feed the `draft` node and are written with `source = web`, while ungrounded model output is `source = llm`. The same `research` node also grounds **product/variant images**: a colour-aware image search whose candidates are each **vision-verified** (right item, right colour, real photo) before one is attached per product and per variant.
4. **Guardrails** — schema validation, anti-hallucination checks, and confidence scoring applied to the graph output.
5. **Persist** — write results back to `enriched_fields`, `runs`, `jobs`, and `products`.

Persisted `enriched_fields` flow back through Supabase Realtime to the review workspace.

### 5.3 Agent design

The enrichment is implemented as a **single LangGraph graph** with discrete nodes (`parse`, `research`, `draft`, `validate`, `assemble`) rather than a free-form multi-agent system. The staged graph gives deterministic, traceable, and individually-evaluable steps — each node's behavior can be traced (`runs.node_traces`) and tested in isolation — which serves the product's core goal of reviewer **trust and provenance** over opaque automation.

---

## 6. External / mocked services

- **LLM provider (OpenAI)** — invoked by the LangGraph nodes for parsing, drafting, and validation. (The mandated stack permits OpenAI or Anthropic.)
- **Web / product research (Tavily)** — a search tool called by the `research` node to look up brand, specs, barcode, and product images for thin rows. Stage 1 grounds **vendor, barcode, and physical specs (weight/dimensions/pack qty)**: the node runs a web search, then a focused LLM extraction pulls verified facts (value/confidence/url) from the snippets — **never estimating**, so unsupported specs stay empty. Grounded facts override the `draft` node and are tagged `source = web` in `enriched_fields`, with citation URLs recorded in `runs.node_traces.research`. Disabled (no-op) when `WEB_SEARCH_API_KEY` is unset.
- **Product/variant image grounding (`worker.media`)** — runs inside the `research` node. Variants are grouped by colourway (colour-aware: size-only variants share one image, distinct colours get their own); for each group a Tavily image search yields candidates that are **each verified by a vision model** for: right item, **right colour** (strict — an unsure/`null` verdict is rejected when a colour is expected, so a generic image can't bleed across colourways), **real product photograph** (not AI-generated, render, illustration, or unrelated), and **good quality** (clear, in-focus, not blurry/tiny/watermarked). The group keeps the **best** passer — a clean catalogue *packshot* is preferred over an on-model/lifestyle shot, then highest confidence — for a consistent gallery across variants. Passers must clear `guardrail_config.media_min_confidence`. The best verified image per colour is attached to its variants and the first verified group seeds the product-level image (`media` rows, `source = web`, `variant_id` set); a group with **no** verified candidate is **left empty** rather than risk a wrong image, for the reviewer to fill. Every candidate's accept/reject reason is recorded in `runs.node_traces.media` for provenance. The vision model (overridable via `guardrail_config.media_vision_model`) is a strong heuristic for "real / right colour", not a guarantee, so the human review gate remains the final backstop. No-op when web search or the LLM is unavailable.
- **Shopify Admin API (2026-01)** — **mocked in Stage 1 (P5)**. The approve/push path is wired but does not hit live Shopify.

### Field-level build-vs-defer scope (Stage 1)

Every enrichment field from the brief is **accounted for** by the generic `enriched_fields` table (one row per `field_name`); the slice fully implements a credible subset and stubs the rest, with the reviewer able to edit any field regardless.

| Field | Stage 1 | Rationale |
|-------|---------|-----------|
| Title (configurable rules) | **Built** | Core demo of normalization + `settings.title_template` regeneration. |
| Description | **Built** | Primary LLM-drafted body; exercises structured output + guardrails. |
| Vendor / brand | **Built** | Inferred from raw name/SKU and **web-grounded** (Tavily, `source = web`) — central to the "thin input" story. |
| Barcode (UPC/EAN/GTIN) | **Built (grounded-only)** | Web-grounded via the `research` node; the `require_grounded_barcode` guardrail drops non-`web` barcodes so only cited values persist. |
| Product type / category | **Built** | Cheap, high-value; drives tags/collections downstream. |
| Tags | **Built** | LLM-drafted from normalized fields. |
| Variants (size grouping) | **Built** | Clustering + `variants` table; required to show grouping logic. |
| SEO meta title + description | **Partial** | Drafted but lightly validated; lower review risk in Stage 1. |
| Weight / dimensions / pack qty | **Built (grounded-only)** | Web-grounded via the `research` node (`source = web`); **no LLM estimation** — fields stay empty for thin/obscure SKUs and the reviewer fills gaps. |
| Product media (verified, per product + variant) | **Built (grounded + vision-verified)** | Colour-aware image search; each candidate is vision-verified (right item/colour, real photo) before one is attached per product and per variant (`source = web`). No verified candidate → left empty. |
| Collections | **Deferred** | Distinct from tags/type; needs a store taxonomy not modeled in Stage 1. |
| Variants by size + color | **Deferred (designed)** | `variants.color` exists; dataset is size-only, so color grouping is schema-ready but not exercised. |

---

## 7. Evals & observability

- **Promptfoo evals → prompts / graph** — offline evaluation of prompts and graph behavior against the dataset.
- **LangGraph tracing → runs / traces** — each enrichment run is traced and persisted to `runs` (with node-level traces, model, token counts, and latency), giving end-to-end observability into what the AI produced and why.
- **LangSmith tracing (optional)** — when enabled (`LANGSMITH_TRACING=true` + an API key), the worker additionally streams each LangGraph run to LangSmith: node spans plus the underlying OpenAI calls (prompts, completions, tokens), tagged with `product_id`/`graph_version` so a trace lines up with its `runs` row. This is *additive developer tooling* for debugging and eval datasets — the `runs` table remains the persisted source of truth for reviewer provenance. Off by default, so no data leaves the system unless opted in.

---

## 8. End-to-end flow

```
Actor
  │  upload batch / review / configure settings
  ▼
Frontend (Next.js)
  │  HTTP
  ▼
BFF API (Next.js route handlers) ──writes──► Supabase (domain tables)
  │                                              │
  │  enqueue                                     │
  ▼                                              ▼
jobs (queue) ◄───────────────────────────────  Supabase
  │  SELECT … FOR UPDATE SKIP LOCKED
  ▼
Python worker
  Preprocessing → Fetch → LangGraph (parse→research→draft→validate→assemble)
                              │            ▲
                              │            └── OpenAI + Web research
                              ▼
                          Guardrails → Persist (enriched_fields · runs · jobs · products)
                              │
                              ▼
                    Supabase Realtime ──► Frontend (live review updates)
                              │
        reviewer approve / push ──► Shopify Admin API (MOCKED, Stage 1)
```

Observability runs alongside: Promptfoo evaluates prompts/graph offline, and LangGraph tracing writes run/trace records to Supabase.
