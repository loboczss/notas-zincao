alter table public.stock_integrin
  add column if not exists locais_estoque jsonb not null default '[]'::jsonb;

with ranked as (
  select
    id,
    idempresa,
    idproduto,
    idsubproduto,
    row_number() over (
      partition by idempresa, idproduto, idsubproduto
      order by is_present desc, updated_at desc, id::text
    ) as rn
  from public.stock_integrin
),
aggregated as (
  select
    idempresa,
    idproduto,
    idsubproduto,
    coalesce(sum(qtdsaldoatual) filter (where is_present), 0) as qtdsaldoatual,
    coalesce(sum(qtdsaldoreserva) filter (where is_present), 0) as qtdsaldoreserva,
    coalesce(sum(qtdsaldodisponivel) filter (where is_present), 0) as qtdsaldodisponivel,
    jsonb_agg(
      jsonb_build_object(
        'idlocalestoque', idlocalestoque,
        'descrlocalestoque', descrlocalestoque,
        'qtdsaldoatual', qtdsaldoatual,
        'qtdsaldoreserva', qtdsaldoreserva,
        'qtdsaldodisponivel', qtdsaldodisponivel,
        'flaglote', flaglote,
        'flagestnegativo', flagestnegativo,
        'flaginativo', flaginativo,
        'dtalteracao', estoque_dtalteracao
      )
      order by idlocalestoque
    ) filter (where is_present) as locais_estoque,
    max(estoque_dtalteracao) filter (where is_present) as estoque_dtalteracao,
    max(integrim_updated_at) filter (where is_present) as integrim_updated_at,
    bool_or(is_present) as is_present
  from public.stock_integrin
  group by idempresa, idproduto, idsubproduto
),
keepers as (
  select id, idempresa, idproduto, idsubproduto
  from ranked
  where rn = 1
)
update public.stock_integrin target
set
  idlocalestoque = 0,
  descrlocalestoque = 'Todos os locais',
  qtdsaldoatual = aggregated.qtdsaldoatual,
  qtdsaldoreserva = aggregated.qtdsaldoreserva,
  qtdsaldodisponivel = aggregated.qtdsaldodisponivel,
  locais_estoque = coalesce(aggregated.locais_estoque, '[]'::jsonb),
  raw_saldo_estoque = jsonb_build_object('locais', coalesce(aggregated.locais_estoque, '[]'::jsonb)),
  estoque_dtalteracao = aggregated.estoque_dtalteracao,
  integrim_updated_at = greatest(
    coalesce(target.cad_produto_dtalteracao, 'epoch'::timestamp),
    coalesce(target.preco_custo_dtalteracao, 'epoch'::timestamp),
    coalesce(aggregated.integrim_updated_at, 'epoch'::timestamp)
  ),
  is_present = aggregated.is_present,
  updated_at = now()
from keepers
join aggregated using (idempresa, idproduto, idsubproduto)
where target.id = keepers.id;

with ranked as (
  select
    id,
    row_number() over (
      partition by idempresa, idproduto, idsubproduto
      order by is_present desc, updated_at desc, id::text
    ) as rn
  from public.stock_integrin
)
delete from public.stock_integrin target
using ranked
where target.id = ranked.id
  and ranked.rn > 1;

alter table public.stock_integrin
  drop constraint if exists stock_integrin_unique_source_row;

alter table public.stock_integrin
  drop constraint if exists stock_integrin_unique_product_per_company;

alter table public.stock_integrin
  add constraint stock_integrin_unique_product_per_company
  unique (idempresa, idproduto, idsubproduto);
