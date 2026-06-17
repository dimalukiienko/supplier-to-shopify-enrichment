# Web App Instructions

Next.js (App Router) frontend **and** Backend-for-Frontend (BFF). See
[`README.md`](README.md) for the stack, layout, and dev commands, and
`docs/ARCHITECTURE.md` §2–§3 for the system flow. For repo-wide rules, see the
root [`../../AGENTS.md`](../../AGENTS.md).

## Conventions

- The BFF (`src/app/api/*`) is the only tier that talks to Supabase. All
  reads/writes and `jobs` enqueues go through the route handlers — Server
  Components and the browser both call the BFF, never Supabase directly.
- Never import the server-only service-role client (`src/lib/supabase.ts`) into
  client components.
- Keep the zod request schemas in `src/lib/schemas.ts` aligned with the SQL
  schema and the `@repo/db` types.

## Validation

- `pnpm --filter @repo/web lint type-check build` (or via the root
  `pnpm turbo run lint type-check build`).
- When the schema changes, regenerate types with
  `pnpm --filter @repo/db gen:types` (CI fails on drift).
