-- Table privileges for the Supabase API roles.
--
-- RLS (previous migration) controls *which rows* a role can see, but PostgREST
-- still requires table-level GRANTs to reach a table at all. The domain tables
-- are created without grants, so without this migration every request through
-- the REST API (the BFF, and anon Realtime reads) fails with 42501.
--
-- The Python worker is unaffected: it connects as the postgres superuser over
-- DATABASE_URL and never goes through PostgREST.

-- service_role is the trusted backend for the BFF (docs/ARCHITECTURE.md §3) and
-- bypasses RLS; give it full DML on every public table.
grant select, insert, update, delete
  on all tables in schema public
  to service_role;

-- The review workspace subscribes to Realtime on products + enriched_fields with
-- the anon/authenticated key. Realtime honors the read policies from the RLS
-- migration, but the roles still need SELECT granted on those two tables.
grant select on public.products        to anon, authenticated;
grant select on public.enriched_fields to anon, authenticated;
