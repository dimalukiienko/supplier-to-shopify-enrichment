# Web (Frontend + BFF)

Next.js (App Router) application that serves the reviewer UI **and** the
Backend-for-Frontend (BFF) API. The frontend is the only tier that talks to
Supabase: Server Components and the browser both go through the BFF route
handlers, which own all reads/writes and enqueue `jobs` for the worker. See
`docs/ARCHITECTURE.md` §2–§3.

## Develop

```bash
pnpm --filter @repo/web dev          # next dev (reads repo-root .env)
pnpm --filter @repo/web build        # next build
pnpm --filter @repo/web lint         # eslint
pnpm --filter @repo/web type-check   # tsc --noEmit
```

Env vars (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, …) come from
the shared repo-root `.env`, loaded by `next.config.mjs` — the worker reads the
same file.

## Layout

- `src/app/` — App Router pages (Server Components):
  - `page.tsx` — upload + batch list; `batches/[batchId]` — batch products;
    `products/[productId]` — field-level review; `settings` — enrichment settings.
  - `api/` — **BFF route handlers**: `batches`, `settings`, `health`, and
    `products/[productId]` actions (`approve`, `retry`, `push`, `fields/[fieldId]`).
- `src/components/` — client components: `UploadForm`, `BatchProducts`,
  `FieldEditable`, `ProductActions`, live-refresh wrappers (`BatchLive`,
  `ReviewLive`), and shell/theming (`AppShell`, `ThemeToggle`, `PageSkeletons`).
- `src/lib/` — shared helpers:
  - `supabase.ts` — server-only service-role client (never import client-side).
  - `bff.ts` — server-side fetch through the BFF for Server Components.
  - `api.ts` — route-handler error/validation helpers.
  - `schemas.ts` — zod request schemas, kept aligned with the SQL schema.
  - `productFields.ts` — review field ordering/typing.

## Stack

Next.js 15 · React 18 · Tailwind CSS 4 · zod · `@supabase/supabase-js` ·
`@repo/db` (workspace types) · lucide-react.
