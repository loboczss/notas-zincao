create or replace function public.stock_integrin_filter_stats(
  p_idempresa integer default null,
  p_idlocalestoque integer default null,
  p_only_available boolean default false,
  p_code_left integer default null,
  p_code_right integer default null,
  p_numeric_code integer default null,
  p_barcode_digits text default null,
  p_text text default ''
)
returns table (
  total_itens integer,
  saldo_disponivel_total numeric,
  empresas integer[],
  locais integer[],
  ultima_sincronizacao timestamp with time zone
)
language sql
stable
set search_path = public
as $$
  with base as materialized (
    select
      stock.idempresa,
      stock.idproduto,
      stock.idsubproduto,
      stock.nrcodbarprod,
      stock.descrcomproduto,
      stock.descrresproduto,
      stock.qtdsaldodisponivel,
      stock.locais_estoque
    from public.stock_integrin stock
    where stock.is_present = true
      and (p_idempresa is null or stock.idempresa = p_idempresa)
      and (not p_only_available or stock.qtdsaldodisponivel > 0)
      and (
        p_idlocalestoque is null
        or exists (
          select 1
          from jsonb_array_elements(coalesce(stock.locais_estoque, '[]'::jsonb)) as local_item
          where nullif((local_item->>'idlocalestoque')::integer, 0) = p_idlocalestoque
        )
      )
  ),
  search_mode as (
    select case
      when p_code_left is not null and p_code_right is not null then 'pair'
      when p_numeric_code is not null
        and exists (
          select 1
          from base
          where idproduto = p_numeric_code
             or idsubproduto = p_numeric_code
        ) then 'numeric'
      when nullif(p_barcode_digits, '') is not null
        and exists (
          select 1
          from base
          where nrcodbarprod like p_barcode_digits || '%'
        ) then 'barcode'
      when nullif(p_text, '') is not null then 'text'
      else 'all'
    end as value
  ),
  matched as materialized (
    select base.*
    from base
    cross join search_mode
    where search_mode.value = 'all'
      or (
        search_mode.value = 'pair'
        and base.idproduto = p_code_left
        and base.idsubproduto = p_code_right
      )
      or (
        search_mode.value = 'numeric'
        and (
          base.idproduto = p_numeric_code
          or base.idsubproduto = p_numeric_code
        )
      )
      or (
        search_mode.value = 'barcode'
        and base.nrcodbarprod like p_barcode_digits || '%'
      )
      or (
        search_mode.value = 'text'
        and (
          base.descrcomproduto ilike '%' || p_text || '%'
          or base.descrresproduto ilike '%' || p_text || '%'
        )
      )
  ),
  local_values as (
    select distinct nullif((local_item->>'idlocalestoque')::integer, 0) as local_id
    from matched
    cross join lateral jsonb_array_elements(coalesce(matched.locais_estoque, '[]'::jsonb)) as local_item
    where nullif((local_item->>'idlocalestoque')::integer, 0) is not null
  )
  select
    count(*)::integer as total_itens,
    coalesce(sum(matched.qtdsaldodisponivel), 0)::numeric(18,3) as saldo_disponivel_total,
    coalesce(
      array_agg(distinct matched.idempresa order by matched.idempresa)
        filter (where matched.idempresa is not null),
      '{}'::integer[]
    ) as empresas,
    coalesce(
      (
        select array_agg(local_id order by local_id)
        from local_values
      ),
      '{}'::integer[]
    ) as locais,
    (
      select summary.ultima_sincronizacao
      from public.stock_integrin_summary summary
      where summary.id = true
    ) as ultima_sincronizacao
  from matched;
$$;

revoke all on function public.stock_integrin_filter_stats(
  integer,
  integer,
  boolean,
  integer,
  integer,
  integer,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.stock_integrin_filter_stats(
  integer,
  integer,
  boolean,
  integer,
  integer,
  integer,
  text,
  text
) to authenticated, service_role;
