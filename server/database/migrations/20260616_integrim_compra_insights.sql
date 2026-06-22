-- Inteligencia de compra: Curva ABC, Sazonalidade e Alerta de Ruptura.
-- Todas usam integrim_produto_venda_dia quando ha historico diario e caem em
-- fallback nos baldes de integrim_produto_valor (30/90/180/365) quando ainda nao
-- houve backfill, para funcionarem mesmo antes da Fase 0/1.

begin;

-- ---------------------------------------------------------------------------
-- Curva ABC (classificacao por faturamento, margem ou quantidade no periodo).
-- ---------------------------------------------------------------------------
create or replace function public.integrim_produto_abc(
  p_idempresa smallint default null,
  p_date_start date default null,
  p_date_end date default null,
  p_metric text default 'faturamento',
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  idempresa smallint,
  idproduto bigint,
  idsubproduto bigint,
  descricao text,
  valor numeric,
  participacao numeric,
  acumulado numeric,
  classe text,
  total_count bigint,
  classe_a_count bigint,
  classe_b_count bigint,
  classe_c_count bigint,
  valor_total numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with params as (
    select
      coalesce(p_date_end, current_date) as date_end_raw,
      coalesce(p_date_start, coalesce(p_date_end, current_date) - 89) as date_start_raw,
      greatest(1, coalesce(p_page, 1)) as page_number,
      least(greatest(coalesce(p_page_size, 50), 1), 200) as page_size,
      nullif(trim(coalesce(p_search, '')), '') as search_term,
      lower(coalesce(nullif(trim(p_metric), ''), 'faturamento')) as metric
  ),
  bounded as (
    select
      least(date_start_raw, date_end_raw) as date_start,
      greatest(date_start_raw, date_end_raw) as date_end,
      page_number, page_size, search_term, metric
    from params
  ),
  periods as (
    select b.*, (b.date_end - b.date_start + 1)::int as periodo_dias from bounded b
  ),
  daily_state as (
    select exists(select 1 from public.integrim_produto_venda_dia) as has_daily_rows
  ),
  vendas as (
    select d.idempresa, d.idproduto, d.idsubproduto,
      sum(d.qtd) as qtd_periodo, sum(d.faturamento) as faturamento_periodo
    from public.integrim_produto_venda_dia d
    cross join periods p
    where d.venda_data between p.date_start and p.date_end
      and (p_idempresa is null or d.idempresa = p_idempresa)
    group by d.idempresa, d.idproduto, d.idsubproduto
  ),
  base as (
    select
      t.idempresa, t.idproduto, t.idsubproduto, t.descricao, t.custo_unit,
      coalesce(v.qtd_periodo, case
        when not ds.has_daily_rows and p.date_end = current_date then
          case p.periodo_dias when 30 then t.qtd_30d when 90 then t.qtd_90d
            when 180 then t.qtd_180d when 365 then t.qtd_365d else 0 end
        else 0 end) as qtd_periodo,
      coalesce(v.faturamento_periodo, case
        when not ds.has_daily_rows and p.date_end = current_date then
          case p.periodo_dias when 30 then t.faturamento_30d when 90 then t.faturamento_90d
            when 180 then t.faturamento_180d when 365 then t.faturamento_365d else 0 end
        else 0 end) as faturamento_periodo,
      p.metric, p.search_term, p.page_number, p.page_size
    from public.integrim_produto_valor t
    cross join periods p
    cross join daily_state ds
    left join vendas v
      on v.idempresa = t.idempresa and v.idproduto = t.idproduto and v.idsubproduto = t.idsubproduto
    where (p_idempresa is null or t.idempresa = p_idempresa)
      and (p.search_term is null
        or t.descricao ilike '%' || p.search_term || '%'
        or t.idproduto::text = p.search_term)
  ),
  valued as (
    select b.*,
      case b.metric
        when 'margem' then round(b.faturamento_periodo - coalesce(b.custo_unit, 0) * b.qtd_periodo, 2)
        when 'quantidade' then b.qtd_periodo
        else b.faturamento_periodo
      end as valor
    from base b
  ),
  ranked as (
    select v.*,
      greatest(v.valor, 0) as valor_pos,
      sum(greatest(v.valor, 0)) over () as total_valor,
      sum(greatest(v.valor, 0)) over (
        order by greatest(v.valor, 0) desc, v.idproduto, v.idsubproduto
        rows between unbounded preceding and current row
      ) as running_valor,
      count(*) over () as total_rows
    from valued v
  ),
  classified as (
    select r.*,
      case when r.total_valor > 0 then round(r.valor_pos / r.total_valor * 100, 2) else 0 end as participacao,
      case when r.total_valor > 0 then round(r.running_valor / r.total_valor * 100, 2) else 0 end as acumulado,
      case
        when r.valor_pos <= 0 then 'C'
        when r.total_valor > 0 and r.running_valor / r.total_valor <= 0.80 then 'A'
        when r.total_valor > 0 and r.running_valor / r.total_valor <= 0.95 then 'B'
        else 'C'
      end as classe
    from ranked r
  )
  select
    c.idempresa, c.idproduto, c.idsubproduto, c.descricao,
    round(c.valor, 2) as valor, c.participacao, c.acumulado, c.classe,
    c.total_rows as total_count,
    count(*) filter (where c.classe = 'A') over () as classe_a_count,
    count(*) filter (where c.classe = 'B') over () as classe_b_count,
    count(*) filter (where c.classe = 'C') over () as classe_c_count,
    round(c.total_valor, 2) as valor_total
  from classified c
  order by c.valor_pos desc, c.idproduto, c.idsubproduto
  limit (select page_size from bounded)
  offset ((select page_number - 1 from bounded) * (select page_size from bounded));
$$;

revoke all on function public.integrim_produto_abc(smallint, date, date, text, text, integer, integer) from public, anon;
grant execute on function public.integrim_produto_abc(smallint, date, date, text, text, integer, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Sazonalidade: demanda por mes do ano. Requer historico diario (venda_dia).
-- Produto opcional (null = todos os produtos da empresa / grupo).
-- ---------------------------------------------------------------------------
create or replace function public.integrim_sazonalidade(
  p_idempresa smallint default null,
  p_idproduto bigint default null,
  p_idsubproduto bigint default null
)
returns table (
  mes integer,
  qtd numeric,
  faturamento numeric,
  num_notas bigint,
  qtd_share numeric,
  faturamento_share numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with agg as (
    select
      extract(month from d.venda_data)::int as mes,
      sum(d.qtd) as qtd,
      sum(d.faturamento) as faturamento,
      sum(d.num_notas) as num_notas
    from public.integrim_produto_venda_dia d
    where (p_idempresa is null or d.idempresa = p_idempresa)
      and (p_idproduto is null or d.idproduto = p_idproduto)
      and (p_idsubproduto is null or d.idsubproduto = p_idsubproduto)
    group by 1
  ),
  totals as (
    select nullif(sum(qtd), 0) as qtd_total, nullif(sum(faturamento), 0) as fat_total from agg
  )
  select
    a.mes,
    round(a.qtd, 3) as qtd,
    round(a.faturamento, 2) as faturamento,
    a.num_notas,
    round(a.qtd / coalesce(t.qtd_total, 1) * 100, 2) as qtd_share,
    round(a.faturamento / coalesce(t.fat_total, 1) * 100, 2) as faturamento_share
  from agg a cross join totals t
  order by a.mes;
$$;

revoke all on function public.integrim_sazonalidade(smallint, bigint, bigint) from public, anon;
grant execute on function public.integrim_sazonalidade(smallint, bigint, bigint) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Alerta de ruptura: produtos que devem zerar antes da reposicao (lead time +
-- cobertura). Funciona com fallback de giro de 90 dias quando ainda nao ha
-- historico diario.
-- ---------------------------------------------------------------------------
create or replace function public.integrim_produto_ruptura(
  p_idempresa smallint default null,
  p_lead_time_dias integer default null,
  p_coverage_days integer default null,
  p_date_start date default null,
  p_date_end date default null,
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  idempresa smallint,
  idproduto bigint,
  idsubproduto bigint,
  descricao text,
  saldo_disponivel numeric,
  custo_unit numeric,
  giro_diario numeric,
  dias_cobertura numeric,
  data_ruptura date,
  lead_time_dias integer,
  coverage_days integer,
  sugestao_compra numeric,
  custo_sugestao numeric,
  total_count bigint,
  stats_total_risco bigint,
  stats_custo_total numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with cfg as (
    select id from public.integrim_compra_parametros limit 1
  ),
  defaults as (
    select
      coalesce(p_lead_time_dias, (select lead_time_dias from public.integrim_compra_parametros limit 1), 7) as lead_time,
      coalesce(p_coverage_days, (select coverage_days from public.integrim_compra_parametros limit 1), 45) as coverage,
      coalesce(p_date_end, current_date) as date_end_raw,
      coalesce(p_date_start, coalesce(p_date_end, current_date) - 89) as date_start_raw,
      greatest(1, coalesce(p_page, 1)) as page_number,
      least(greatest(coalesce(p_page_size, 50), 1), 200) as page_size,
      nullif(trim(coalesce(p_search, '')), '') as search_term
  ),
  periods as (
    select
      least(date_start_raw, date_end_raw) as date_start,
      greatest(date_start_raw, date_end_raw) as date_end,
      (greatest(date_start_raw, date_end_raw) - least(date_start_raw, date_end_raw) + 1)::int as periodo_dias,
      lead_time, coverage, page_number, page_size, search_term
    from defaults
  ),
  daily_state as (
    select exists(select 1 from public.integrim_produto_venda_dia) as has_daily_rows
  ),
  vendas as (
    select d.idempresa, d.idproduto, d.idsubproduto, sum(d.qtd) as qtd_periodo
    from public.integrim_produto_venda_dia d
    cross join periods p
    where d.venda_data between p.date_start and p.date_end
      and (p_idempresa is null or d.idempresa = p_idempresa)
    group by d.idempresa, d.idproduto, d.idsubproduto
  ),
  base as (
    select
      t.idempresa, t.idproduto, t.idsubproduto, t.descricao,
      t.saldo_disponivel, t.custo_unit,
      case
        when v.qtd_periodo is not null and p.periodo_dias > 0 then v.qtd_periodo / p.periodo_dias
        when t.qtd_90d > 0 then t.qtd_90d / 90.0
        when t.qtd_30d > 0 then t.qtd_30d / 30.0
        else 0
      end as giro_diario,
      p.lead_time, p.coverage, p.page_number, p.page_size, p.search_term
    from public.integrim_produto_valor t
    cross join periods p
    cross join daily_state ds
    left join vendas v
      on v.idempresa = t.idempresa and v.idproduto = t.idproduto and v.idsubproduto = t.idsubproduto
    where (p_idempresa is null or t.idempresa = p_idempresa)
      and (p.search_term is null
        or t.descricao ilike '%' || p.search_term || '%'
        or t.idproduto::text = p.search_term)
  ),
  calc as (
    select b.*,
      case when b.giro_diario > 0 then round(b.saldo_disponivel / b.giro_diario, 1) else null end as dias_cobertura,
      round(greatest(0, b.giro_diario * (b.lead_time + b.coverage) - b.saldo_disponivel), 3) as sugestao_compra
    from base b
  ),
  risco as (
    select c.*,
      (current_date + floor(coalesce(c.dias_cobertura, 0))::int) as data_ruptura,
      round(greatest(0, c.giro_diario * (c.lead_time + c.coverage) - c.saldo_disponivel) * coalesce(c.custo_unit, 0), 2) as custo_sugestao
    from calc c
    where c.giro_diario > 0
      and c.dias_cobertura is not null
      and c.dias_cobertura <= (c.lead_time + c.coverage)
  ),
  counted as (
    select r.*,
      count(*) over () as total_count,
      count(*) over () as stats_total_risco,
      coalesce(sum(r.custo_sugestao) over (), 0) as stats_custo_total
    from risco r
  )
  select
    c.idempresa, c.idproduto, c.idsubproduto, c.descricao,
    c.saldo_disponivel, c.custo_unit,
    round(c.giro_diario, 4) as giro_diario,
    c.dias_cobertura,
    c.data_ruptura,
    c.lead_time as lead_time_dias,
    c.coverage as coverage_days,
    c.sugestao_compra,
    c.custo_sugestao,
    c.total_count, c.stats_total_risco, c.stats_custo_total
  from counted c
  order by c.dias_cobertura asc nulls last, c.giro_diario desc
  limit (select page_size from periods)
  offset ((select page_number - 1 from periods) * (select page_size from periods));
$$;

revoke all on function public.integrim_produto_ruptura(smallint, integer, integer, date, date, text, integer, integer) from public, anon;
grant execute on function public.integrim_produto_ruptura(smallint, integer, integer, date, date, text, integer, integer) to authenticated, service_role;

commit;
