-- Vendas por vendedor. Espelha integrim_produto_venda_dia, mas agregando por
-- vendedor/dia (capturado do idvendedor nos itens). idvendedor = 0 representa
-- itens sem vendedor atribuido (tipicamente cupom/PDV). num_itens conta linhas
-- de item, nao notas distintas.
--
-- A dimensao integrim_vendedores (idvendedor -> nome) e populada separadamente,
-- via cpfvendedor dos cabecalhos cruzado com CAD_PESSOAS (por endpoint dedicado).

begin;

-- ---------------------------------------------------------------------------
-- 1) Vendas agregadas por vendedor/dia
-- ---------------------------------------------------------------------------
create table if not exists public.integrim_venda_vendedor_dia (
  id uuid primary key default gen_random_uuid(),
  idempresa smallint not null,
  idvendedor bigint not null,
  venda_data date not null,
  qtd numeric(15,3) not null default 0,
  faturamento numeric(15,2) not null default 0,
  num_itens integer not null default 0,
  sync_run_id uuid,
  updated_at timestamptz not null default now(),
  constraint integrim_venda_vendedor_dia_unique unique (idempresa, idvendedor, venda_data)
);

create index if not exists integrim_venda_vendedor_dia_empresa_data_idx
  on public.integrim_venda_vendedor_dia (idempresa, venda_data);
create index if not exists integrim_venda_vendedor_dia_data_idx
  on public.integrim_venda_vendedor_dia (venda_data);
create index if not exists integrim_venda_vendedor_dia_vendedor_idx
  on public.integrim_venda_vendedor_dia (idvendedor);

alter table public.integrim_venda_vendedor_dia enable row level security;
drop policy if exists integrim_venda_vendedor_dia_authenticated_read on public.integrim_venda_vendedor_dia;
create policy integrim_venda_vendedor_dia_authenticated_read
  on public.integrim_venda_vendedor_dia for select to authenticated using (true);
revoke all on table public.integrim_venda_vendedor_dia from public, anon, authenticated;
grant select on table public.integrim_venda_vendedor_dia to authenticated;
grant all on table public.integrim_venda_vendedor_dia to service_role;

-- ---------------------------------------------------------------------------
-- 2) Dimensao de vendedores (idvendedor -> cpf -> nome)
-- ---------------------------------------------------------------------------
create table if not exists public.integrim_vendedores (
  idvendedor bigint primary key,
  cpf text,
  nome text,
  updated_at timestamptz not null default now()
);

alter table public.integrim_vendedores enable row level security;
drop policy if exists integrim_vendedores_authenticated_read on public.integrim_vendedores;
create policy integrim_vendedores_authenticated_read
  on public.integrim_vendedores for select to authenticated using (true);
revoke all on table public.integrim_vendedores from public, anon, authenticated;
grant select on table public.integrim_vendedores to authenticated;
grant all on table public.integrim_vendedores to service_role;

-- ---------------------------------------------------------------------------
-- 3) RPC: vendas por vendedor no intervalo, com comparacao ao periodo anterior
-- ---------------------------------------------------------------------------
create or replace function public.integrim_vendas_por_vendedor(
  p_date_start date,
  p_date_end date,
  p_idempresa smallint default null
)
returns table (
  idvendedor bigint,
  nome text,
  faturamento numeric,
  qtd numeric,
  num_itens bigint,
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
      (p_date_start - ((p_date_end - p_date_start) + 1))::date as ini_ant,
      (p_date_start - 1)::date as fim_ant
  ),
  atual as (
    select v.idvendedor,
           sum(v.faturamento) as faturamento,
           sum(v.qtd) as qtd,
           sum(v.num_itens)::bigint as num_itens
    from public.integrim_venda_vendedor_dia v, bounds b
    where v.venda_data between b.ini and b.fim
      and (p_idempresa is null or v.idempresa = p_idempresa)
    group by v.idvendedor
  ),
  anterior as (
    select v.idvendedor, sum(v.faturamento) as faturamento_ant
    from public.integrim_venda_vendedor_dia v, bounds b
    where v.venda_data between b.ini_ant and b.fim_ant
      and (p_idempresa is null or v.idempresa = p_idempresa)
    group by v.idvendedor
  )
  select
    a.idvendedor,
    case when a.idvendedor = 0 then 'Sem vendedor'
         else coalesce(nullif(trim(d.nome), ''), 'Vendedor ' || a.idvendedor) end as nome,
    round(a.faturamento, 2) as faturamento,
    round(a.qtd, 3) as qtd,
    a.num_itens,
    round(coalesce(p.faturamento_ant, 0), 2) as faturamento_ant,
    case when coalesce(p.faturamento_ant, 0) > 0
         then round(100.0 * (a.faturamento - p.faturamento_ant) / p.faturamento_ant, 1)
         else null end as variacao_pct
  from atual a
  left join anterior p using (idvendedor)
  left join public.integrim_vendedores d on d.idvendedor = a.idvendedor
  order by a.faturamento desc;
$$;

revoke all on function public.integrim_vendas_por_vendedor(date, date, smallint) from public, anon;
grant execute on function public.integrim_vendas_por_vendedor(date, date, smallint) to authenticated, service_role;

commit;
