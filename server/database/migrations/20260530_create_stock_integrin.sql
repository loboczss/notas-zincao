create table if not exists public.stock_integrin (
  id uuid primary key default gen_random_uuid(),
  idempresa integer not null,
  idproduto integer not null,
  idsubproduto integer not null,
  idlocalestoque integer not null default 0,
  descrlocalestoque text,
  descrcomproduto text not null,
  descrresproduto text,
  nrcodbarprod text,
  ncm text,
  embalagem_saida text,
  idsecao integer,
  descrsecao text,
  idgrupo integer,
  descrgrupo text,
  idsubgrupo integer,
  descrsubgrupo text,
  valprecovarejo numeric(15,6),
  valpromvarejo numeric(15,6),
  valcustorepos numeric(15,6),
  custogerencial numeric(15,6),
  custonotafiscal numeric(15,6),
  qtdsaldoatual numeric(15,3) not null default 0,
  qtdsaldoreserva numeric(15,3) not null default 0,
  qtdsaldodisponivel numeric(15,3) not null default 0,
  flaglote text,
  flagestnegativo text,
  flaginativo text not null default 'F',
  cad_produto_dtalteracao timestamp without time zone,
  preco_custo_dtalteracao timestamp without time zone,
  estoque_dtalteracao timestamp without time zone,
  integrim_updated_at timestamp without time zone,
  raw_cad_produto jsonb not null default '{}'::jsonb,
  raw_preco_custo jsonb not null default '{}'::jsonb,
  raw_saldo_estoque jsonb not null default '{}'::jsonb,
  sync_run_id uuid,
  last_seen_at timestamp with time zone not null default now(),
  is_present boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint stock_integrin_unique_source_row unique (idempresa, idproduto, idsubproduto, idlocalestoque)
);

create index if not exists stock_integrin_search_idx
  on public.stock_integrin using gin (
    to_tsvector(
      'simple',
      coalesce(descrcomproduto, '') || ' ' ||
      coalesce(descrresproduto, '') || ' ' ||
      coalesce(nrcodbarprod, '')
    )
  );

create index if not exists stock_integrin_company_product_idx
  on public.stock_integrin (idempresa, idproduto, idsubproduto);

create index if not exists stock_integrin_available_idx
  on public.stock_integrin (idempresa, qtdsaldodisponivel)
  where is_present = true and flaginativo = 'F';

alter table public.stock_integrin enable row level security;

drop policy if exists stock_integrin_authenticated_read on public.stock_integrin;
create policy stock_integrin_authenticated_read
  on public.stock_integrin
  for select
  to authenticated
  using (true);

revoke all on table public.stock_integrin from public, anon, authenticated;
grant select on table public.stock_integrin to authenticated;
grant all on table public.stock_integrin to service_role;

create table if not exists public.stock_integrin_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running', 'success', 'failed')),
  triggered_by text not null default 'manual',
  started_at timestamp with time zone not null default now(),
  finished_at timestamp with time zone,
  cad_produtos_total integer not null default 0,
  precos_total integer not null default 0,
  saldos_total integer not null default 0,
  upserted_rows integer not null default 0,
  deactivated_rows integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists stock_integrin_sync_runs_started_idx
  on public.stock_integrin_sync_runs (started_at desc);

alter table public.stock_integrin_sync_runs enable row level security;

drop policy if exists stock_integrin_sync_runs_authenticated_read on public.stock_integrin_sync_runs;
create policy stock_integrin_sync_runs_authenticated_read
  on public.stock_integrin_sync_runs
  for select
  to authenticated
  using (true);

revoke all on table public.stock_integrin_sync_runs from public, anon, authenticated;
grant select on table public.stock_integrin_sync_runs to authenticated;
grant all on table public.stock_integrin_sync_runs to service_role;
