create table if not exists public.stock_integrin_summary (
  id boolean primary key default true check (id),
  total_itens integer not null default 0,
  saldo_disponivel_total numeric(18,3) not null default 0,
  empresas integer[] not null default '{}'::integer[],
  locais integer[] not null default '{}'::integer[],
  ultima_sincronizacao timestamp with time zone,
  updated_at timestamp with time zone not null default now()
);

alter table public.stock_integrin_summary enable row level security;

drop policy if exists stock_integrin_summary_authenticated_read on public.stock_integrin_summary;
create policy stock_integrin_summary_authenticated_read
  on public.stock_integrin_summary
  for select
  to authenticated
  using (true);

revoke all on table public.stock_integrin_summary from public, anon, authenticated;
grant select on table public.stock_integrin_summary to authenticated;
grant all on table public.stock_integrin_summary to service_role;

create index if not exists stock_integrin_present_sort_idx
  on public.stock_integrin (is_present, idempresa, descrcomproduto, idproduto, idsubproduto);

create or replace function public.refresh_stock_integrin_summary()
returns void
language plpgsql
set search_path = public
as $$
declare
  latest_sync timestamp with time zone;
begin
  select coalesce(finished_at, started_at)
    into latest_sync
  from public.stock_integrin_sync_runs
  where status = 'success'
  order by started_at desc
  limit 1;

  insert into public.stock_integrin_summary as summary (
    id,
    total_itens,
    saldo_disponivel_total,
    empresas,
    locais,
    ultima_sincronizacao,
    updated_at
  )
  select
    true,
    count(*)::integer,
    coalesce(sum(qtdsaldodisponivel), 0)::numeric(18,3),
    coalesce(
      array_agg(distinct idempresa order by idempresa)
        filter (where idempresa is not null),
      '{}'::integer[]
    ),
    coalesce(
      (
        select array_agg(distinct local_id order by local_id)
        from (
          select nullif((local_item->>'idlocalestoque')::integer, 0) as local_id
          from public.stock_integrin stock
          cross join lateral jsonb_array_elements(stock.locais_estoque) as local_item
          where stock.is_present = true
        ) locais_source
        where local_id is not null
      ),
      '{}'::integer[]
    ),
    latest_sync,
    now()
  from public.stock_integrin
  where is_present = true
  on conflict (id) do update set
    total_itens = excluded.total_itens,
    saldo_disponivel_total = excluded.saldo_disponivel_total,
    empresas = excluded.empresas,
    locais = excluded.locais,
    ultima_sincronizacao = excluded.ultima_sincronizacao,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.refresh_stock_integrin_summary() from public, anon, authenticated;
grant execute on function public.refresh_stock_integrin_summary() to service_role;

select public.refresh_stock_integrin_summary();
