-- Melhora a busca da lista de compra para achar produto por CODIGO (id):
--   * casa tambem o formato combinado "idproduto/idsubproduto" (ex.: "376/376");
--   * prioriza no topo os matches por codigo exato — antes o produto buscado por
--     id caia depois da pagina 1 (ordenacao por risco), soterrado por descricoes
--     que apenas continham o numero (ex.: buscar "12" trazia "TELHA 12MTS" e nao o
--     produto 12). Match por codigo agora vem primeiro; descricao que comeca com o
--     termo vem em seguida; o resto mantem a ordenacao normal.
-- O bypass do "so repor agora" ao buscar e feito no front (localizado a tela),
-- para nao afetar outros consumidores da RPC (ex.: relatorio PDF).
-- Mantidos search_path e statement_timeout ja aplicados a funcao.

create or replace function public.integrim_lista_compra(
  p_idempresa smallint default null::smallint,
  p_lead_time_dias integer default 7,
  p_coverage_days integer default 30,
  p_service_level numeric default 0.95,
  p_horizon_days integer default 90,
  p_only_buy boolean default true,
  p_search text default null::text,
  p_sort text default 'risco'::text,
  p_page integer default 1,
  p_page_size integer default 50
)
returns table(idempresa smallint, idproduto bigint, idsubproduto bigint, descricao text, estoque_ausente boolean, saldo_disponivel numeric, custo_unit numeric, demanda_diaria numeric, desvio_diario numeric, cv numeric, lead_time_dias integer, coverage_days integer, estoque_seguranca numeric, ponto_reposicao numeric, dias_ate_ruptura numeric, precisa_comprar boolean, sugestao_compra numeric, capital_necessario numeric, margem_unit numeric, dinheiro_em_risco numeric, faturamento_periodo numeric, qtd_periodo numeric, dias_com_venda integer, ultima_venda date, tendencia_percent numeric, classe_abc text, classe_xyz text, confianca text, total_count bigint, stats_itens_comprar bigint, stats_capital_total numeric, stats_risco_total numeric)
 language plpgsql
 stable
 set search_path to 'public', 'pg_temp'
 set statement_timeout to '20000'
as $function$
declare
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_size integer := least(greatest(coalesce(p_page_size, 50), 1), 200);
begin
  return query
  with params as (
    select
      current_date as date_end,
      (current_date - (greatest(7, least(coalesce(p_horizon_days, 90), 730)) - 1))::date as date_start,
      greatest(7, least(coalesce(p_horizon_days, 90), 730)) as horizon_days,
      greatest(0, least(coalesce(p_lead_time_dias, 7), 365)) as lead_time_dias,
      greatest(1, least(coalesce(p_coverage_days, 30), 365)) as coverage_days,
      case
        when coalesce(p_service_level, 0.95) >= 0.99 then 2.3263
        when coalesce(p_service_level, 0.95) >= 0.975 then 1.9600
        when coalesce(p_service_level, 0.95) >= 0.95 then 1.6449
        when coalesce(p_service_level, 0.95) >= 0.90 then 1.2816
        when coalesce(p_service_level, 0.95) >= 0.85 then 1.0364
        else 0.8416
      end as z,
      coalesce(p_only_buy, true) as only_buy,
      nullif(trim(coalesce(p_search, '')), '') as search_term,
      coalesce(nullif(trim(p_sort), ''), 'risco') as sort_key
  ),
  demanda as (
    select
      d.idempresa, d.idproduto, d.idsubproduto,
      sum(d.qtd) as soma_qtd,
      sum(d.qtd * d.qtd) as soma_qtd2,
      sum(d.faturamento) as soma_fat,
      count(*)::integer as dias_com_venda,
      max(d.venda_data) as ultima_venda,
      sum(d.qtd) filter (where d.venda_data > p.date_end - (p.horizon_days / 2)) as qtd_recente,
      sum(d.qtd) filter (where d.venda_data <= p.date_end - (p.horizon_days / 2)) as qtd_antiga
    from public.integrim_produto_venda_dia d
    cross join params p
    where d.venda_data between p.date_start and p.date_end
      and (p_idempresa is null or d.idempresa = p_idempresa)
    group by d.idempresa, d.idproduto, d.idsubproduto
  ),
  enriched as (
    select
      dm.idempresa, dm.idproduto, dm.idsubproduto,
      coalesce(t.descricao, dm.idproduto::text || '/' || dm.idsubproduto::text) as descricao,
      (t.id is null) as estoque_ausente,
      coalesce(t.saldo_disponivel, 0) as saldo_disponivel,
      t.custo_unit, dm.soma_qtd, dm.soma_fat, dm.dias_com_venda, dm.ultima_venda,
      dm.qtd_recente, dm.qtd_antiga,
      p.horizon_days, p.lead_time_dias, p.coverage_days, p.z,
      (dm.soma_qtd / p.horizon_days::numeric) as demanda_diaria,
      sqrt(greatest(0,
        dm.soma_qtd2 / p.horizon_days::numeric
        - power(dm.soma_qtd / p.horizon_days::numeric, 2)
      ))::numeric as desvio_diario
    from demanda dm
    cross join params p
    left join public.integrim_produto_valor t
      on t.idempresa = dm.idempresa and t.idproduto = dm.idproduto and t.idsubproduto = dm.idsubproduto
  ),
  metrics as (
    select
      e.*,
      case when e.demanda_diaria > 0 then e.desvio_diario / e.demanda_diaria else null end as cv,
      round(e.z * e.desvio_diario * sqrt(greatest(e.lead_time_dias, 1))::numeric, 3) as estoque_seguranca,
      round(e.demanda_diaria * e.lead_time_dias
        + e.z * e.desvio_diario * sqrt(greatest(e.lead_time_dias, 1))::numeric, 3) as ponto_reposicao,
      case when e.demanda_diaria > 0 then round(e.saldo_disponivel / e.demanda_diaria, 1) else null end as dias_ate_ruptura,
      round(greatest(0,
        e.demanda_diaria * (e.lead_time_dias + e.coverage_days)
        + e.z * e.desvio_diario * sqrt(greatest(e.lead_time_dias, 1))::numeric
        - e.saldo_disponivel
      ), 3) as sugestao_compra,
      case when e.soma_qtd > 0 then round(e.soma_fat / e.soma_qtd - coalesce(e.custo_unit, 0), 4) else null end as margem_unit,
      round(
        greatest(0, e.demanda_diaria * e.lead_time_dias - e.saldo_disponivel)
        * greatest(0, case when e.soma_qtd > 0 then e.soma_fat / e.soma_qtd - coalesce(e.custo_unit, 0) else 0 end),
        2
      ) as dinheiro_em_risco,
      case when e.qtd_antiga > 0 then round((e.qtd_recente - e.qtd_antiga) / e.qtd_antiga * 100, 1) else null end as tendencia_percent
    from enriched e
  ),
  decided as (
    select
      m.*,
      (m.demanda_diaria > 0 and m.saldo_disponivel <= m.ponto_reposicao) as precisa_comprar,
      round(m.sugestao_compra * coalesce(m.custo_unit, 0), 2) as capital_necessario,
      case when m.cv is null then 'Z' when m.cv <= 0.5 then 'X' when m.cv <= 1.0 then 'Y' else 'Z' end as classe_xyz,
      case
        when m.dias_com_venda >= m.horizon_days * 0.20 and coalesce(m.cv, 9) <= 0.6 then 'alta'
        when m.dias_com_venda >= m.horizon_days * 0.08 then 'media'
        else 'baixa'
      end as confianca
    from metrics m
  ),
  abc as (
    select
      d.*,
      case
        when sum(d.soma_fat) over () = 0 then 'C'
        when (sum(d.soma_fat) over (order by d.soma_fat desc rows unbounded preceding))
             / nullif(sum(d.soma_fat) over (), 0) <= 0.80 then 'A'
        when (sum(d.soma_fat) over (order by d.soma_fat desc rows unbounded preceding))
             / nullif(sum(d.soma_fat) over (), 0) <= 0.95 then 'B'
        else 'C'
      end as classe_abc
    from decided d
  ),
  filtered as (
    select a.*
    from abc a
    cross join params p
    where (not p.only_buy or a.precisa_comprar)
      and (
        p.search_term is null
        or a.descricao ilike '%' || p.search_term || '%'
        or a.idproduto::text = p.search_term
        or a.idsubproduto::text = p.search_term
        or (a.idproduto::text || '/' || a.idsubproduto::text) = p.search_term
      )
  ),
  counted as (
    select
      f.*,
      count(*) over () as total_count,
      count(*) filter (where f.precisa_comprar) over () as stats_itens_comprar,
      coalesce(sum(f.capital_necessario) over (), 0) as stats_capital_total,
      coalesce(sum(f.dinheiro_em_risco) over (), 0) as stats_risco_total
    from filtered f
  )
  select
    c.idempresa, c.idproduto, c.idsubproduto, c.descricao, c.estoque_ausente,
    c.saldo_disponivel, c.custo_unit,
    round(c.demanda_diaria, 4), round(c.desvio_diario, 4), round(c.cv, 3),
    c.lead_time_dias, c.coverage_days, c.estoque_seguranca, c.ponto_reposicao,
    c.dias_ate_ruptura, c.precisa_comprar, c.sugestao_compra, c.capital_necessario,
    c.margem_unit, c.dinheiro_em_risco, round(c.soma_fat, 2), round(c.soma_qtd, 3),
    c.dias_com_venda, c.ultima_venda, c.tendencia_percent,
    c.classe_abc, c.classe_xyz, c.confianca,
    c.total_count, c.stats_itens_comprar, c.stats_capital_total, c.stats_risco_total
  from counted c
  cross join params p
  order by
    -- Relevancia da busca: codigo exato primeiro, depois descricao que comeca com
    -- o termo; sem busca todos empatam e cai na ordenacao normal por risco/etc.
    case
      when p.search_term is null then 1
      when c.idproduto::text = p.search_term
        or c.idsubproduto::text = p.search_term
        or (c.idproduto::text || '/' || c.idsubproduto::text) = p.search_term then 0
      when c.descricao ilike p.search_term || '%' then 1
      else 2
    end asc,
    case when p.sort_key = 'ruptura' then c.dias_ate_ruptura end asc nulls last,
    case when p.sort_key = 'sugestao' then c.sugestao_compra end desc,
    case when p.sort_key = 'faturamento' then c.soma_fat end desc,
    case when p.sort_key not in ('ruptura', 'sugestao', 'faturamento') then c.dinheiro_em_risco end desc,
    c.dinheiro_em_risco desc, c.soma_fat desc
  offset (v_page - 1) * v_size
  limit v_size;
end;
$function$;
