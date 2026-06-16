-- Row-level security.
--
-- The BFF API and the Python worker connect with the service_role key, which
-- bypasses RLS — they are the only writers (docs/ARCHITECTURE.md §3, §5). RLS is
-- enabled on every table so nothing is reachable by default with the anon key.
--
-- The one exception: the review workspace subscribes to Realtime changes on
-- enriched_fields and products with the anon/authenticated key, and Realtime
-- honors RLS, so those two tables get read-only policies.

alter table public.batches          enable row level security;
alter table public.supplier_rows    enable row level security;
alter table public.products         enable row level security;
alter table public.variants         enable row level security;
alter table public.enriched_fields  enable row level security;
alter table public.jobs             enable row level security;
alter table public.runs             enable row level security;
alter table public.settings         enable row level security;
alter table public.prompt_versions  enable row level security;

-- Read-only access for Realtime subscribers (review workspace).
create policy "read enriched_fields"
  on public.enriched_fields
  for select
  to authenticated, anon
  using (true);

create policy "read products"
  on public.products
  for select
  to authenticated, anon
  using (true);
