alter table public.stock_integrin_sync_runs
  drop constraint if exists stock_integrin_sync_runs_status_check;

alter table public.stock_integrin_sync_runs
  add constraint stock_integrin_sync_runs_status_check
  check (status in ('running', 'success', 'failed', 'cancelled'));

alter table public.stock_integrin_sync_runs
  add column if not exists cancel_requested boolean not null default false,
  add column if not exists cancel_requested_at timestamp with time zone;

create index if not exists stock_integrin_sync_runs_running_cancel_idx
  on public.stock_integrin_sync_runs (status, cancel_requested)
  where status = 'running';
