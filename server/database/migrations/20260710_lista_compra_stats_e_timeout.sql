-- Sequela do sync completo de estoque + finalize: as 3 updates do finalize tocam
-- todas as ~16k linhas de integrim_produto_valor e invalidam as estatisticas. A
-- RPC integrim_lista_compra (que monta a tela "O que comprar agora") agrega 90
-- dias de vendas diarias cruzando com produto_valor; com stats velhas o plano
-- degrada e estoura o statement_timeout curto do papel authenticated, quebrando a
-- listagem ("Nao foi possivel montar a lista de compra").
--
-- Duas defesas:
--   1) finalize passa a rodar ANALYZE em integrim_produto_valor no fim, mantendo o
--      plano da lista saudavel logo apos cada sync.
--   2) integrim_lista_compra ganha um statement_timeout proprio (20s), folga o
--      suficiente para uma variacao transitoria nao virar erro na tela.

create or replace function public.finalize_integrim_produto_valor(
  p_lead_time_days integer default 15,
  p_horizonte_days integer default 30
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
set statement_timeout to '600000'
as $function$
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

  -- Mantem o plano da RPC integrim_lista_compra saudavel apos o batch.
  analyze public.integrim_produto_valor;
end;
$function$;

alter function public.integrim_lista_compra(
  smallint, integer, integer, numeric, integer, boolean, text, text, integer, integer
) set statement_timeout to '20000';
