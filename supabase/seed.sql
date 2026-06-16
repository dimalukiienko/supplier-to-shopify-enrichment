-- Seed data applied by `supabase db reset`. Default enrichment config + the
-- initial active prompt versions so the worker has settings/prompts to read.

insert into public.settings (title_template, default_model, guardrail_config)
values (
  '[{"token":"Brand"},{"token":"Size"},{"token":"Name"}]'::jsonb,
  'gpt-4o-mini',
  '{"min_confidence":0.4,"require_grounded_barcode":true}'::jsonb
);

insert into public.prompt_versions (name, version, content, is_active) values
  ('cluster', 1, 'Cluster supplier rows that represent the same product into one product with variants.', true),
  ('enrich_product', 1, 'Enrich the product: draft title, description, vendor, type, and tags from the normalized inputs.', true);
