-- Vendas por loja (empresa) num intervalo, com comparacao ao periodo anterior de
-- mesmo tamanho. Le a base ja agregada integrim_produto_venda_dia (produto/dia),
-- somando por idempresa. Sem custo de varrer itens: a tabela ja e agregada.

begin;

create or replace function public.integrim_vendas_por_loja(
  p_date_start date,
  p_date_end date
)
returns table (
  idempresa smallint,
  faturamento numeric,
  qtd numeric,
  num_notas bigint,
  faturamento_ant numeric,
  variacao_pct numeric
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with bounds as (
    select
      p_date_start as ini,
      p_date_end as fim,
      -- janela anterior de mesmo tamanho, imediatamente antes de p_date_start
      (p_date_start - ((p_date_end - p_date_start) + 1))::date as ini_ant,
      (p_date_start - 1)::date as fim_ant
  ),
  atual as (
    select v.idempresa,
           sum(v.faturamento) as faturamento,
           sum(v.qtd) as qtd,
           sum(v.num_notas)::bigint as num_notas
    from public.integrim_produto_venda_dia v, bounds b
    where v.venda_data between b.ini and b.fim
    group by v.idempresa
  ),
  anterior as (
    select v.idempresa, sum(v.faturamento) as faturamento_ant
    from public.integrim_produto_venda_dia v, bounds b
    where v.venda_data between b.ini_ant and b.fim_ant
    group by v.idempresa
  )
  select
    a.idempresa,
    round(a.faturamento, 2) as faturamento,
    round(a.qtd, 3) as qtd,
    a.num_notas,
    round(coalesce(p.faturamento_ant, 0), 2) as faturamento_ant,
    case when coalesce(p.faturamento_ant, 0) > 0
         then round(100.0 * (a.faturamento - p.faturamento_ant) / p.faturamento_ant, 1)
         else null end as variacao_pct
  from atual a
  left join anterior p using (idempresa)
  order by a.faturamento desc;
$$;

revoke all on function public.integrim_vendas_por_loja(date, date) from public, anon;
grant execute on function public.integrim_vendas_por_loja(date, date) to authenticated, service_role;

commit;
