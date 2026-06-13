-- Analise de valor/previsao de compras: vendas reais (itens) por produto cruzadas
-- com saldo/custo do stock_integrin. As vendas (~1,5M itens) sao agregadas em
-- memoria pelo sync e gravadas aqui (base); a funcao finalize enriquece com estoque
-- e calcula derivados + score.

begin;

create table if not exists public.integrim_produto_valor (
  id uuid primary key default gen_random_uuid(),
  idempresa smallint not null,
  idproduto bigint not null,
  idsubproduto bigint not null,
  descricao text,
  saldo_disponivel numeric(15,3) not null default 0,
  custo_unit numeric(15,6),
  qtd_30d numeric(15,3) not null default 0,
  qtd_90d numeric(15,3) not null default 0,
  qtd_180d numeric(15,3) not null default 0,
  qtd_365d numeric(15,3) not null default 0,
  faturamento_30d numeric(15,2) not null default 0,
  faturamento_90d numeric(15,2) not null default 0,
  faturamento_180d numeric(15,2) not null default 0,
  faturamento_365d numeric(15,2) not null default 0,
  margem_365d numeric(15,2) not null default 0,
  num_notas_365d integer not null default 0,
  ultima_venda date,
  giro_diario numeric(15,4) not null default 0,
  dias_cobertura numeric(15,1),
  sugestao_compra numeric(15,3) not null default 0,
  score_valor numeric(5,1) not null default 0,
  updated_at timestamptz not null default now(),
  constraint integrim_produto_valor_unique unique (idempresa, idproduto, idsubproduto)
);

create index if not exists integrim_produto_valor_score_idx
  on public.integrim_produto_valor (score_valor desc);
create index if not exists integrim_produto_valor_empresa_idx
  on public.integrim_produto_valor (idempresa);

alter table public.integrim_produto_valor enable row level security;
drop policy if exists integrim_produto_valor_authenticated_read on public.integrim_produto_valor;
create policy integrim_produto_valor_authenticated_read
  on public.integrim_produto_valor for select to authenticated using (true);
revoke all on table public.integrim_produto_valor from public, anon, authenticated;
grant select on table public.integrim_produto_valor to authenticated;
grant all on table public.integrim_produto_valor to service_role;

-- Enriquece as vendas agregadas com estoque/custo e calcula margem, giro,
-- cobertura, sugestao de compra e score. WHERE explicito por causa do safeupdate.
create or replace function public.finalize_integrim_produto_valor(
  p_lead_time_days integer default 15,
  p_horizonte_days integer default 30
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_alvo numeric := greatest(1, p_lead_time_days + p_horizonte_days);
begin
  update public.integrim_produto_valor t set
    saldo_disponivel = coalesce(s.qtdsaldodisponivel, 0),
    custo_unit = coalesce(s.custogerencial, s.valcustorepos, s.custonotafiscal),
    descricao = coalesce(s.descrcomproduto, t.descricao)
  from public.stock_integrin s
  where s.idempresa = t.idempresa
    and s.idproduto = t.idproduto
    and s.idsubproduto = t.idsubproduto
    and s.is_present = true;

  update public.integrim_produto_valor t set
    margem_365d = round(t.faturamento_365d - coalesce(t.custo_unit, 0) * t.qtd_365d, 2),
    giro_diario = round(t.qtd_90d / 90.0, 4),
    dias_cobertura = case when t.qtd_90d > 0 then round(t.saldo_disponivel / (t.qtd_90d / 90.0), 1) else null end,
    sugestao_compra = round(greatest(0, (t.qtd_90d / 90.0) * v_alvo - t.saldo_disponivel), 3)
  where t.id is not null;

  with m as (
    select
      nullif(max(faturamento_365d), 0) as max_fat,
      nullif(max(margem_365d), 0) as max_margem,
      nullif(max(giro_diario), 0) as max_giro
    from public.integrim_produto_valor
  )
  update public.integrim_produto_valor t set
    score_valor = round(100 * (
      0.35 * (t.faturamento_365d / coalesce(m.max_fat, 1))
      + 0.30 * (greatest(t.margem_365d, 0) / coalesce(m.max_margem, 1))
      + 0.20 * (t.giro_diario / coalesce(m.max_giro, 1))
      + 0.15 * (case when t.dias_cobertura is null then 0
                     else greatest(0, least(1, (v_alvo - t.dias_cobertura) / v_alvo)) end)
    ), 1),
    updated_at = now()
  from m
  where t.id is not null;
end;
$$;

revoke all on function public.finalize_integrim_produto_valor(integer, integer) from public, anon, authenticated;
grant execute on function public.finalize_integrim_produto_valor(integer, integer) to service_role;

commit;
