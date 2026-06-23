-- Sazonalidade por ano: permite filtrar a curva por mes do ano para um ano
-- especifico (ou todos) e expoe a lista de anos disponiveis para o seletor da UI.
-- Antes a curva sempre somava todos os anos juntos, sem deixar claro o periodo.

begin;

-- ---------------------------------------------------------------------------
-- Curva sazonal (faturamento/qtd por mes do ano), agora com filtro de ano.
-- p_ano nulo = consolidado de todos os anos (comportamento anterior).
-- ---------------------------------------------------------------------------
drop function if exists public.integrim_sazonalidade(smallint, bigint, bigint);

create or replace function public.integrim_sazonalidade(
  p_idempresa smallint default null,
  p_idproduto bigint default null,
  p_idsubproduto bigint default null,
  p_ano integer default null
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
      and (p_ano is null or extract(year from d.venda_data)::int = p_ano)
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

revoke all on function public.integrim_sazonalidade(smallint, bigint, bigint, integer) from public, anon;
grant execute on function public.integrim_sazonalidade(smallint, bigint, bigint, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Anos disponiveis no historico (para popular o seletor), com totais por ano.
-- ---------------------------------------------------------------------------
create or replace function public.integrim_sazonalidade_anos(
  p_idempresa smallint default null,
  p_idproduto bigint default null,
  p_idsubproduto bigint default null
)
returns table (
  ano integer,
  qtd numeric,
  faturamento numeric,
  num_notas bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    extract(year from d.venda_data)::int as ano,
    round(sum(d.qtd), 3) as qtd,
    round(sum(d.faturamento), 2) as faturamento,
    sum(d.num_notas) as num_notas
  from public.integrim_produto_venda_dia d
  where (p_idempresa is null or d.idempresa = p_idempresa)
    and (p_idproduto is null or d.idproduto = p_idproduto)
    and (p_idsubproduto is null or d.idsubproduto = p_idsubproduto)
  group by 1
  order by 1 desc;
$$;

revoke all on function public.integrim_sazonalidade_anos(smallint, bigint, bigint) from public, anon;
grant execute on function public.integrim_sazonalidade_anos(smallint, bigint, bigint) to authenticated, service_role;

commit;
