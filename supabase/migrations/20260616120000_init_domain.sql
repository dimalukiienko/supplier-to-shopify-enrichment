-- Domain tables: batches, supplier_rows, products, variants, enriched_fields.
-- Source of truth: docs/DATABASE.md §3.1–3.5.

create extension if not exists "pgcrypto";

-- Shared trigger to maintain updated_at on row updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3.1 batches -----------------------------------------------------------------
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_format text not null check (source_format in ('csv', 'xlsx')),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'clustering', 'enriching', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger batches_set_updated_at
  before update on public.batches
  for each row execute function public.set_updated_at();

-- 3.2 supplier_rows -----------------------------------------------------------
create table public.supplier_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  row_id text,
  product_name text,
  supplier_sku text,
  barcode text,
  supplier_notes text,
  unit_price numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index supplier_rows_batch_id_idx on public.supplier_rows (batch_id);

create trigger supplier_rows_set_updated_at
  before update on public.supplier_rows
  for each row execute function public.set_updated_at();

-- 3.3 products ----------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'enriching', 'enriched', 'approved', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_batch_id_idx on public.products (batch_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- 3.4 variants ----------------------------------------------------------------
create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  supplier_row_id uuid references public.supplier_rows (id) on delete set null,
  size text,
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index variants_product_id_idx on public.variants (product_id);
create index variants_supplier_row_id_idx on public.variants (supplier_row_id);

create trigger variants_set_updated_at
  before update on public.variants
  for each row execute function public.set_updated_at();

-- 3.5 enriched_fields ---------------------------------------------------------
create table public.enriched_fields (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.variants (id) on delete cascade,
  field_name text not null,
  value text,
  confidence numeric,
  source text not null default 'llm' check (source in ('llm', 'web', 'manual')),
  status text not null default 'ai' check (status in ('ai', 'accepted', 'overridden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index enriched_fields_product_id_idx on public.enriched_fields (product_id);
create index enriched_fields_variant_id_idx on public.enriched_fields (variant_id);

create trigger enriched_fields_set_updated_at
  before update on public.enriched_fields
  for each row execute function public.set_updated_at();
