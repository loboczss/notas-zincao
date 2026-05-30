create or replace function public.search_stock_integrin(
  p_search text default '',
  p_idempresa integer default null,
  p_idlocalestoque integer default null,
  p_only_available boolean default false,
  p_limit integer default 51,
  p_offset integer default 0
)
returns table (
  id uuid,
  idempresa integer,
  idproduto integer,
  idsubproduto integer,
  idlocalestoque integer,
  descrlocalestoque text,
  descrcomproduto text,
  descrresproduto text,
  nrcodbarprod text,
  ncm text,
  embalagem_saida text,
  descrsecao text,
  descrgrupo text,
  descrsubgrupo text,
  valprecovarejo numeric,
  valpromvarejo numeric,
  valcustorepos numeric,
  custogerencial numeric,
  custonotafiscal numeric,
  qtdsaldoatual numeric,
  qtdsaldoreserva numeric,
  qtdsaldodisponivel numeric,
  locais_estoque jsonb,
  flaglote text,
  flagestnegativo text,
  flaginativo text,
  cad_produto_dtalteracao timestamp without time zone,
  preco_custo_dtalteracao timestamp without time zone,
  estoque_dtalteracao timestamp without time zone,
  integrim_updated_at timestamp without time zone,
  sync_run_id uuid,
  last_seen_at timestamp with time zone,
  is_present boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  search_rank integer
)
language sql
stable
set search_path = public
as $$
  with input as (
    select
      btrim(coalesce(p_search, '')) as raw_search,
      lower(btrim(coalesce(p_search, ''))) as lowered_search
  ),
  parsed as (
    select
      raw_search,
      lowered_search,
      regexp_replace(regexp_replace(lowered_search, '^prod\.?\s*', ''), '[^0-9/]', '', 'g') as product_code,
      regexp_replace(lowered_search, '\D', '', 'g') as digits
    from input
  ),
  search_values as (
    select
      raw_search,
      lowered_search,
      case
        when product_code ~ '^[0-9]{1,9}/[0-9]{1,9}$'
          then split_part(product_code, '/', 1)::integer
        else null
      end as code_left,
      case
        when product_code ~ '^[0-9]{1,9}/[0-9]{1,9}$'
          then split_part(product_code, '/', 2)::integer
        else null
      end as code_right,
      case
        when product_code ~ '^[0-9]{1,9}$'
          then product_code::integer
        when digits ~ '^[0-9]{1,9}$'
          then digits::integer
        else null
      end as numeric_code,
      case
        when length(digits) >= 6 then digits
        else null
      end as barcode_digits
    from parsed
  ),
  ranked as (
    select
      stock.id,
      stock.idempresa,
      stock.idproduto,
      stock.idsubproduto,
      stock.idlocalestoque,
      stock.descrlocalestoque,
      stock.descrcomproduto,
      stock.descrresproduto,
      stock.nrcodbarprod,
      stock.ncm,
      stock.embalagem_saida,
      stock.descrsecao,
      stock.descrgrupo,
      stock.descrsubgrupo,
      stock.valprecovarejo,
      stock.valpromvarejo,
      stock.valcustorepos,
      stock.custogerencial,
      stock.custonotafiscal,
      stock.qtdsaldoatual,
      stock.qtdsaldoreserva,
      stock.qtdsaldodisponivel,
      stock.locais_estoque,
      stock.flaglote,
      stock.flagestnegativo,
      stock.flaginativo,
      stock.cad_produto_dtalteracao,
      stock.preco_custo_dtalteracao,
      stock.estoque_dtalteracao,
      stock.integrim_updated_at,
      stock.sync_run_id,
      stock.last_seen_at,
      stock.is_present,
      stock.created_at,
      stock.updated_at,
      case
        when search.raw_search = '' then 100
        when search.code_left is not null
          and stock.idproduto = search.code_left
          and stock.idsubproduto = search.code_right then 0
        when search.numeric_code is not null
          and stock.idproduto = search.numeric_code
          and stock.idsubproduto = search.numeric_code then 1
        when search.numeric_code is not null
          and (stock.idproduto = search.numeric_code or stock.idsubproduto = search.numeric_code) then 2
        when search.barcode_digits is not null and stock.nrcodbarprod = search.barcode_digits then 3
        when lower(stock.descrcomproduto) = search.lowered_search
          or lower(coalesce(stock.descrresproduto, '')) = search.lowered_search then 4
        when search.barcode_digits is not null and stock.nrcodbarprod like search.barcode_digits || '%' then 5
        when lower(stock.descrcomproduto) like search.lowered_search || '%'
          or lower(coalesce(stock.descrresproduto, '')) like search.lowered_search || '%' then 6
        when lower(stock.descrcomproduto) like '%' || search.lowered_search || '%'
          or lower(coalesce(stock.descrresproduto, '')) like '%' || search.lowered_search || '%' then 7
        when search.barcode_digits is not null and stock.nrcodbarprod like '%' || search.barcode_digits || '%' then 8
        else 99
      end as search_rank
    from public.stock_integrin stock
    cross join search_values search
    where stock.is_present = true
      and (p_idempresa is null or stock.idempresa = p_idempresa)
      and (p_idlocalestoque is null or stock.locais_estoque @> jsonb_build_array(jsonb_build_object('idlocalestoque', p_idlocalestoque)))
      and (not p_only_available or stock.qtdsaldodisponivel > 0)
      and (
        search.raw_search = ''
        or (
          search.code_left is not null
          and stock.idproduto = search.code_left
          and stock.idsubproduto = search.code_right
        )
        or (
          search.numeric_code is not null
          and (stock.idproduto = search.numeric_code or stock.idsubproduto = search.numeric_code)
        )
        or (
          search.barcode_digits is not null
          and stock.nrcodbarprod like '%' || search.barcode_digits || '%'
        )
        or lower(stock.descrcomproduto) like '%' || search.lowered_search || '%'
        or lower(coalesce(stock.descrresproduto, '')) like '%' || search.lowered_search || '%'
      )
  )
  select *
  from ranked
  where search_rank < 99
  order by
    search_rank asc,
    idempresa asc,
    descrcomproduto asc,
    idproduto asc,
    idsubproduto asc
  limit greatest(1, least(coalesce(p_limit, 51), 201))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.search_stock_integrin(text, integer, integer, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.search_stock_integrin(text, integer, integer, boolean, integer, integer) to authenticated, service_role;
