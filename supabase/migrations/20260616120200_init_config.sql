-- Configuration tables: settings and prompt_versions.
-- Source of truth: docs/DATABASE.md §3.8–3.9.

-- 3.8 settings ----------------------------------------------------------------
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  title_template jsonb not null default '[]'::jsonb,
  default_model text not null default 'gpt-4o-mini',
  guardrail_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- 3.9 prompt_versions ---------------------------------------------------------
create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null,
  content text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version)
);

-- At most one active version per prompt name.
create unique index prompt_versions_active_idx
  on public.prompt_versions (name)
  where is_active;

create trigger prompt_versions_set_updated_at
  before update on public.prompt_versions
  for each row execute function public.set_updated_at();
