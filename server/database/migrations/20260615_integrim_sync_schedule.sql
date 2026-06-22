-- Agendamento configuravel da sincronizacao das notas do Integrim e parametros
-- de compra (lead time / cobertura). Substitui o agendamento fixo por ENV do
-- plugin Nitro: o horario e a janela passam a ser escolhidos pelo usuario.

begin;

-- Config de agendamento (linha unica / singleton).
create table if not exists public.integrim_sync_schedule (
  id boolean primary key default true,
  enabled boolean not null default true,
  times text[] not null default array['03:00']::text[],
  window_months integer not null default 24 check (window_months between 1 and 120),
  timezone text not null default 'America/Sao_Paulo',
  deactivate_stale boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint integrim_sync_schedule_singleton check (id)
);

insert into public.integrim_sync_schedule (id)
values (true)
on conflict (id) do nothing;

alter table public.integrim_sync_schedule enable row level security;
drop policy if exists integrim_sync_schedule_authenticated_read on public.integrim_sync_schedule;
create policy integrim_sync_schedule_authenticated_read
  on public.integrim_sync_schedule for select to authenticated using (true);
revoke all on table public.integrim_sync_schedule from public, anon, authenticated;
grant select on table public.integrim_sync_schedule to authenticated;
grant all on table public.integrim_sync_schedule to service_role;

-- Parametros de compra (lead time medio e cobertura padrao). Singleton.
-- Lead time aqui e configurado manualmente; quando a sincronizacao de notas de
-- ENTRADA for adicionada, pode ser derivado por fornecedor automaticamente.
create table if not exists public.integrim_compra_parametros (
  id boolean primary key default true,
  lead_time_dias integer not null default 7 check (lead_time_dias between 0 and 365),
  coverage_days integer not null default 45 check (coverage_days between 1 and 365),
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint integrim_compra_parametros_singleton check (id)
);

insert into public.integrim_compra_parametros (id)
values (true)
on conflict (id) do nothing;

alter table public.integrim_compra_parametros enable row level security;
drop policy if exists integrim_compra_parametros_authenticated_read on public.integrim_compra_parametros;
create policy integrim_compra_parametros_authenticated_read
  on public.integrim_compra_parametros for select to authenticated using (true);
revoke all on table public.integrim_compra_parametros from public, anon, authenticated;
grant select on table public.integrim_compra_parametros to authenticated;
grant all on table public.integrim_compra_parametros to service_role;

commit;
