-- Estatisticas agregadas de estoque para pagina de listagem paginada.
-- Retorna quantidade total de itens e soma de QUANTIDADEESTOQUE com os mesmos filtros da listagem.

create or replace function public.get_estoque_stats(
  p_search text default null,
  p_tipo text default null
)
returns table (
  total_itens bigint,
  quantidade_total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint as total_itens,
    coalesce(sum(coalesce(e."QUANTIDADEESTOQUE", 0)), 0)::numeric as quantidade_total
  from public.bd_estoque_geral e
  where
    (
      p_tipo is null
      or btrim(p_tipo) = ''
      or e."TIPOPRODUTO" = p_tipo
    )
    and (
      p_search is null
      or btrim(p_search) = ''
      or e."DESCRICAO" ilike ('%' || p_search || '%')
      or (
        p_search ~ '^[0-9]+$'
        and e."IDPRODUTO" = p_search::bigint
      )
    );
$$;

grant execute on function public.get_estoque_stats(text, text) to authenticated;
