-- Indicadores agregados da analise de valor (para os cards da pagina).
create or replace function public.integrim_produto_valor_stats(p_idempresa smallint default null)
returns table (
  total_produtos integer,
  faturamento_365d_total numeric,
  margem_365d_total numeric,
  produtos_em_risco integer,
  ultima_sincronizacao timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    count(*)::int as total_produtos,
    coalesce(sum(faturamento_365d), 0) as faturamento_365d_total,
    coalesce(sum(margem_365d), 0) as margem_365d_total,
    count(*) filter (where dias_cobertura is not null and dias_cobertura < 30 and giro_diario > 0)::int as produtos_em_risco,
    max(updated_at) as ultima_sincronizacao
  from public.integrim_produto_valor
  where p_idempresa is null or idempresa = p_idempresa;
$$;

revoke all on function public.integrim_produto_valor_stats(smallint) from public, anon;
grant execute on function public.integrim_produto_valor_stats(smallint) to authenticated, service_role;
