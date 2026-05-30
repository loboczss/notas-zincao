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
language plpgsql
stable
set search_path = public
as $$
declare
  has_numeric_match boolean := false;
  has_barcode_match boolean := false;
begin
  if p_code_left is not null and p_code_right is not null then
    return query
      select
        count(*)::integer,
        coalesce(sum(stock.qtdsaldodisponivel), 0)::numeric(18,3),
        coalesce(
          array_agg(distinct stock.idempresa order by stock.idempresa)
            filter (where stock.idempresa is not null),
          '{}'::integer[]
        ),
        '{}'::integer[],
        (
          select summary.ultima_sincronizacao
          from public.stock_integrin_summary summary
          where summary.id = true
        )
      from public.stock_integrin stock
      where stock.is_present = true
        and stock.idproduto = p_code_left
        and stock.idsubproduto = p_code_right
        and (p_idempresa is null or stock.idempresa = p_idempresa)
        and (not p_only_available or stock.qtdsaldodisponivel > 0)
        and (
          p_idlocalestoque is null
          or exists (
            select 1
            from jsonb_array_elements(coalesce(stock.locais_estoque, '[]'::jsonb)) as local_item
            where nullif((local_item->>'idlocalestoque')::integer, 0) = p_idlocalestoque
          )
        );
    return;
  end if;

  if p_numeric_code is not null then
    select exists (
      select 1
      from public.stock_integrin stock
      where stock.is_present = true
        and (stock.idproduto = p_numeric_code or stock.idsubproduto = p_numeric_code)
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
    ) into has_numeric_match;

    if has_numeric_match then
      return query
        select
          count(*)::integer,
          coalesce(sum(stock.qtdsaldodisponivel), 0)::numeric(18,3),
          coalesce(
            array_agg(distinct stock.idempresa order by stock.idempresa)
              filter (where stock.idempresa is not null),
            '{}'::integer[]
          ),
          '{}'::integer[],
          (
            select summary.ultima_sincronizacao
            from public.stock_integrin_summary summary
            where summary.id = true
          )
        from public.stock_integrin stock
        where stock.is_present = true
          and (stock.idproduto = p_numeric_code or stock.idsubproduto = p_numeric_code)
          and (p_idempresa is null or stock.idempresa = p_idempresa)
          and (not p_only_available or stock.qtdsaldodisponivel > 0)
          and (
            p_idlocalestoque is null
            or exists (
              select 1
              from jsonb_array_elements(coalesce(stock.locais_estoque, '[]'::jsonb)) as local_item
              where nullif((local_item->>'idlocalestoque')::integer, 0) = p_idlocalestoque
            )
          );
      return;
    end if;
  end if;

  if nullif(p_barcode_digits, '') is not null then
    select exists (
      select 1
      from public.stock_integrin stock
      where stock.is_present = true
        and stock.nrcodbarprod like p_barcode_digits || '%'
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
    ) into has_barcode_match;

    if has_barcode_match then
      return query
        select
          count(*)::integer,
          coalesce(sum(stock.qtdsaldodisponivel), 0)::numeric(18,3),
          coalesce(
            array_agg(distinct stock.idempresa order by stock.idempresa)
              filter (where stock.idempresa is not null),
            '{}'::integer[]
          ),
          '{}'::integer[],
          (
            select summary.ultima_sincronizacao
            from public.stock_integrin_summary summary
            where summary.id = true
          )
        from public.stock_integrin stock
        where stock.is_present = true
          and stock.nrcodbarprod like p_barcode_digits || '%'
          and (p_idempresa is null or stock.idempresa = p_idempresa)
          and (not p_only_available or stock.qtdsaldodisponivel > 0)
          and (
            p_idlocalestoque is null
            or exists (
              select 1
              from jsonb_array_elements(coalesce(stock.locais_estoque, '[]'::jsonb)) as local_item
              where nullif((local_item->>'idlocalestoque')::integer, 0) = p_idlocalestoque
            )
          );
      return;
    end if;
  end if;

  if nullif(p_text, '') is not null then
    return query
      select
        count(*)::integer,
        coalesce(sum(stock.qtdsaldodisponivel), 0)::numeric(18,3),
        coalesce(
          array_agg(distinct stock.idempresa order by stock.idempresa)
            filter (where stock.idempresa is not null),
          '{}'::integer[]
        ),
        '{}'::integer[],
        (
          select summary.ultima_sincronizacao
          from public.stock_integrin_summary summary
          where summary.id = true
        )
      from public.stock_integrin stock
      where stock.is_present = true
        and (
          stock.descrcomproduto ilike '%' || p_text || '%'
          or stock.descrresproduto ilike '%' || p_text || '%'
        )
        and (p_idempresa is null or stock.idempresa = p_idempresa)
        and (not p_only_available or stock.qtdsaldodisponivel > 0)
        and (
          p_idlocalestoque is null
          or exists (
            select 1
            from jsonb_array_elements(coalesce(stock.locais_estoque, '[]'::jsonb)) as local_item
            where nullif((local_item->>'idlocalestoque')::integer, 0) = p_idlocalestoque
          )
        );
    return;
  end if;

  return query
    select
      count(*)::integer,
      coalesce(sum(stock.qtdsaldodisponivel), 0)::numeric(18,3),
      coalesce(
        array_agg(distinct stock.idempresa order by stock.idempresa)
          filter (where stock.idempresa is not null),
        '{}'::integer[]
      ),
      '{}'::integer[],
      (
        select summary.ultima_sincronizacao
        from public.stock_integrin_summary summary
        where summary.id = true
      )
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
      );
end;
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
