# Repository Instructions

## Project Context

This repository defines the supplier-to-Shopify enrichment workflow: thin supplier product data is normalized, enriched with AI, reviewed by a human, and then prepared for Shopify publishing.

Authoritative project docs:

- `ARCHITECTURE.md` describes the Stage 1 application architecture and end-to-end enrichment flow.
- `DATABASE.md` describes the Supabase/Postgres schema, queue tables, traces, settings, and relationships.
- `docs/architecture.drawio` is the editable architecture diagram.
- `data/products_input.csv` and `data/products_input.xlsx` are the sample supplier inputs.

## When To Read Docs

- Read `ARCHITECTURE.md` before changing module boundaries, system flow, worker behavior, review workflow, Shopify publishing behavior, or external-service responsibilities.
- Read `DATABASE.md` before changing schemas, migrations, query behavior, enrichment persistence, product/variant modeling, job queue logic, or trace/run records.
- Check `docs/architecture.drawio` when architecture documentation and diagrams need to stay aligned.

## Current Implementation State

- The repository currently contains architecture/database documentation, sample data, AI-work hooks, and diagrams.
- Do not assume a Next.js, Python, Supabase, or LangGraph codebase already exists unless the relevant files have been added.
- When adding implementation, follow the stack described in `ARCHITECTURE.md` unless the user explicitly changes direction.

## Development Rules

- Keep changes scoped to the user's request.
- Preserve source-of-truth documentation when adding code: update `ARCHITECTURE.md` or `DATABASE.md` if implementation decisions change the documented architecture or schema.
- Keep generated or local AI-work history under `docs/ai-work-history/` unless the user asks to modify it.
- Do not mutate sample data files unless the task is specifically about input data or fixtures.

## Validation

- There is no standard build or test command in the repository yet.
- For documentation-only changes, review Markdown rendering and links.
- When application code is added later, document the relevant install, build, lint, and test commands here.
