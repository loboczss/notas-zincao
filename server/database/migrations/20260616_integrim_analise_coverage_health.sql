-- Fase 2 (cobertura honesta) + Fase 3 (saude do sync).
-- Expoe se o periodo pedido tem dados diarios reais (integrim_produto_venda_dia)
-- ou se cai no fallback de presets, para a UI nao mostrar zeros silenciosos.

begin;

create or replace function public.integrim_venda_dia_coverage(
  p_idempresa smallint default null,
  p_date_start date default null,
  p_date_end date default null
)
returns table (
  has_daily_rows boolean,
  daily_min_date date,
  daily_max_date date,
  dias_com_dados integer,
  periodo_dias integer,
  fallback_aplicavel boolean,
  periodo_coberto boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with p as (
    select
      coalesce(p_date_end, current_date) as de,
      coalesce(p_date_start, coalesce(p_date_end, current_date) - 89) as ds
  ),
  b as (
    select least(ds, de) as ds, greatest(ds, de) as de from p
  ),
  agg as (
    select
      exists(select 1 from public.integrim_produto_venda_dia) as has_rows,
      (select min(venda_data) from public.integrim_produto_venda_dia d
        where p_idempresa is null or d.idempresa = p_idempresa) as min_date,
      (select max(venda_data) from public.integrim_produto_venda_dia d
        where p_idempresa is null or d.idempresa = p_idempresa) as max_date,
      (select count(distinct d.venda_data)::int
        from public.integrim_produto_venda_dia d, b
        where d.venda_data between b.ds and b.de
          and (p_idempresa is null or d.idempresa = p_idempresa)) as dias
  )
  select
    agg.has_rows,
    agg.min_date,
    agg.max_date,
    coalesce(agg.dias, 0),
    (select (de - ds + 1)::int from b),
    (not agg.has_rows
      and (select de from b) = current_date
      and (select (de - ds + 1) from b) in (30, 90, 180, 365)) as fallback_aplicavel,
    (coalesce(agg.dias, 0) > 0
      or (not agg.has_rows
        and (select de from b) = current_date
        and (select (de - ds + 1) from b) in (30, 90, 180, 365))) as periodo_coberto
  from agg;
$$;

revoke all on function public.integrim_venda_dia_coverage(smallint, date, date) from public, anon;
grant execute on function public.integrim_venda_dia_coverage(smallint, date, date) to authenticated, service_role;

-- Saude da sincronizacao: ultimo sucesso/falha, frescor dos dados diarios.
-- SECURITY DEFINER para ler integrim_notas_sync_runs sem depender de RLS.
create or replace function public.integrim_sync_health()
returns table (
  last_success_at timestamptz,
  last_finished_at timestamptz,
  last_status text,
  last_error text,
  last_triggered_by text,
  running boolean,
  daily_rows bigint,
  daily_min_date date,
  daily_max_date date,
  daily_stale_days integer,
  produtos bigint,
  base_updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select max(finished_at) from public.integrim_notas_sync_runs where status = 'success'),
    (select finished_at from public.integrim_notas_sync_runs order by started_at desc limit 1),
    (select status from public.integrim_notas_sync_runs order by started_at desc limit 1),
    (select left(coalesce(error_message, ''), 400) from public.integrim_notas_sync_runs order by started_at desc limit 1),
    (select triggered_by from public.integrim_notas_sync_runs order by started_at desc limit 1),
    exists(select 1 from public.integrim_notas_sync_runs where status = 'running'),
    (select count(*) from public.integrim_produto_venda_dia),
    (select min(venda_data) from public.integrim_produto_venda_dia),
    (select max(venda_data) from public.integrim_produto_venda_dia),
    (select (current_date - max(venda_data))::int from public.integrim_produto_venda_dia),
    (select count(*) from public.integrim_produto_valor),
    (select max(updated_at) from public.integrim_produto_valor);
$$;

revoke all on function public.integrim_sync_health() from public, anon;
grant execute on function public.integrim_sync_health() to authenticated, service_role;

commit;
