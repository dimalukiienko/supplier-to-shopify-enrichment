-- Realtime: stream worker output back to the review workspace as it lands.
-- The UI subscribes to enriched_fields and products.status (docs/ARCHITECTURE.md §4).

alter publication supabase_realtime add table public.enriched_fields;
alter publication supabase_realtime add table public.products;

-- REPLICA IDENTITY FULL so updates carry old values for client-side diffing.
alter table public.enriched_fields replica identity full;
alter table public.products replica identity full;
