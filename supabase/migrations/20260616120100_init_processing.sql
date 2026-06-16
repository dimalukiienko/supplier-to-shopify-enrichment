-- Processing tables: jobs (durable work queue) and runs (execution traces).
-- Source of truth: docs/DATABASE.md §3.6–3.7.

-- 3.6 jobs --------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('cluster_batch', 'enrich_product')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'done', 'failed')),
  product_id uuid references public.products (id) on delete cascade,
  batch_id uuid references public.batches (id) on delete cascade,
  payload jsonb,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Partial index supporting the queue consumer's hot path:
--   ... where status = 'queued' order by created_at for update skip locked
create index jobs_queue_idx
  on public.jobs (created_at)
  where status = 'queued';

create index jobs_product_id_idx on public.jobs (product_id);
create index jobs_batch_id_idx on public.jobs (batch_id);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- 3.7 runs --------------------------------------------------------------------
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  graph_version text,
  status text not null default 'success' check (status in ('success', 'partial', 'failed')),
  node_traces jsonb,
  model text,
  prompt_version text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index runs_product_id_idx on public.runs (product_id);
create index runs_job_id_idx on public.runs (job_id);

create trigger runs_set_updated_at
  before update on public.runs
  for each row execute function public.set_updated_at();
