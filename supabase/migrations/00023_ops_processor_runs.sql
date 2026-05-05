create table if not exists public.ops_processor_runs (
  id uuid primary key default gen_random_uuid(),
  processor_name text not null,
  idempotency_key text not null,
  status text not null check (status in ('processing', 'completed', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  unique (processor_name, idempotency_key)
);

create index if not exists idx_ops_processor_runs_started_at
  on public.ops_processor_runs (started_at desc);
