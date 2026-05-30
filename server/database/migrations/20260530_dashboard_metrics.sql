-- Precomputed dashboard metrics.
-- Keeps the dashboard off broad PostgREST reads, avoiding the 1000-row API cap.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table if not exists public.dashboard_metrics (
  id text primary key default 'global',
  total_notas integer not null default 0,
  pendentes integer not null default 0,
  parciais integer not null default 0,
  retiradas integer not null default 0,
  canceladas integer not null default 0,
  pecas_compradas numeric not null default 0,
  pecas_entregues numeric not null default 0,
  pecas_pendentes numeric not null default 0,
  percentual_entrega integer not null default 0,
  produto_10_id bigint,
  produto_10_nome text,
  produto_10_saldo_estoque numeric not null default 0,
  produto_10_notas_pendentes_com_produto integer not null default 0,
  produto_10_quantidade_pendente_notas numeric not null default 0,
  produto_10_percentual_comprometido integer not null default 0,
  produto_10_quantidade_filhos integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint dashboard_metrics_singleton check (id = 'global'),
  constraint dashboard_metrics_percentual_entrega_range check (percentual_entrega between 0 and 100),
  constraint dashboard_metrics_produto_10_percentual_range check (produto_10_percentual_comprometido between 0 and 100)
);

alter table public.dashboard_metrics enable row level security;
alter table public.dashboard_metrics force row level security;

revoke all on table public.dashboard_metrics from public, anon, authenticated;
grant select on table public.dashboard_metrics to authenticated;

drop policy if exists dashboard_metrics_select_active_role on public.dashboard_metrics;
create policy dashboard_metrics_select_active_role
on public.dashboard_metrics
for select
to authenticated
using (
  (select private.has_active_role(array['admin', 'colaborador', 'vendedor', 'operador', 'visualizador']))
);

create or replace function private.dashboard_metric_number(value text)
returns numeric
language plpgsql
immutable
set search_path = pg_temp
as $$
declare
  normalized text;
begin
  normalized := replace(trim(coalesce(value, '')), ',', '.');

  if normalized = '' then
    return 0;
  end if;

  return normalized::numeric;
exception when others then
  return 0;
end;
$$;

create or replace function private.refresh_dashboard_metrics()
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_total_notas integer := 0;
  v_pendentes integer := 0;
  v_parciais integer := 0;
  v_retiradas integer := 0;
  v_canceladas integer := 0;
  v_pecas_compradas numeric := 0;
  v_pecas_entregues numeric := 0;
  v_pecas_pendentes numeric := 0;
  v_percentual_entrega integer := 0;
  v_produto_10_id bigint := 10;
  v_produto_10_nome text := 'Produto ID 10';
  v_produto_10_saldo numeric := 0;
  v_produto_10_notas integer := 0;
  v_produto_10_pendente numeric := 0;
  v_produto_10_percentual integer := 0;
  v_produto_10_filhos integer := 0;
begin
  with active_notas as (
    select lower(trim(coalesce(status_retirada, ''))) as status_retirada
    from public.notas_retirada
    where deleted_at is null
  )
  select
    count(*)::integer,
    count(*) filter (where status_retirada = 'pendente')::integer,
    count(*) filter (where status_retirada = 'parcial')::integer,
    count(*) filter (where status_retirada = 'retirada')::integer,
    count(*) filter (where status_retirada = 'cancelada')::integer
  into
    v_total_notas,
    v_pendentes,
    v_parciais,
    v_retiradas,
    v_canceladas
  from active_notas;

  with active_notas as (
    select
      case
        when jsonb_typeof(produtos) = 'array' then produtos
        else '[]'::jsonb
      end as produtos
    from public.notas_retirada
    where deleted_at is null
  ),
  product_items as (
    select
      private.dashboard_metric_number(product_item.item ->> 'quantidade') as quantidade,
      private.dashboard_metric_number(product_item.item ->> 'quantidade_retirada') as quantidade_retirada
    from active_notas n
    cross join lateral jsonb_array_elements(n.produtos) as product_item(item)
  )
  select
    coalesce(round(sum(quantidade), 2), 0),
    coalesce(round(sum(quantidade_retirada), 2), 0)
  into v_pecas_compradas, v_pecas_entregues
  from product_items;

  v_pecas_pendentes := greatest(0, round(v_pecas_compradas - v_pecas_entregues, 2));
  v_percentual_entrega := case
    when v_pecas_compradas > 0 then least(100, greatest(0, round((v_pecas_entregues / v_pecas_compradas) * 100)::integer))
    else 0
  end;

  select
    e."IDPRODUTO",
    coalesce(e."DESCRICAO", 'Produto ID 10'),
    coalesce(e."QUANTIDADEESTOQUE", 0)
  into
    v_produto_10_id,
    v_produto_10_nome,
    v_produto_10_saldo
  from public.bd_estoque_geral e
  where e."IDPRODUTO" = 10
  limit 1;

  if v_produto_10_id is null then
    v_produto_10_id := 10;
    v_produto_10_nome := 'Produto ID 10';
    v_produto_10_saldo := 0;
  end if;

  select count(*)::integer
  into v_produto_10_filhos
  from public.bd_estoque_geral e
  where e."IDPRODUTOPAI" = 10;

  with related_products as (
    select
      e."IDPRODUTO"::bigint as id_produto,
      case
        when e."IDPRODUTO" = 10 then 1::numeric
        when coalesce(e."FATORCONVERSAO", 0) > 0 then e."FATORCONVERSAO"
        else 1::numeric
      end as fator
    from public.bd_estoque_geral e
    where e."IDPRODUTO" = 10
      or e."IDPRODUTOPAI" = 10
  ),
  pending_notas as (
    select
      id,
      case
        when jsonb_typeof(produtos) = 'array' then produtos
        else '[]'::jsonb
      end as produtos
    from public.notas_retirada
    where deleted_at is null
      and lower(trim(coalesce(status_retirada, ''))) = 'pendente'
  ),
  product_items as (
    select
      n.id as nota_id,
      case
        when (product_item.item ->> 'id_produto_estoque') ~ '^[0-9]+$'
          then (product_item.item ->> 'id_produto_estoque')::bigint
        else null
      end as id_produto,
      private.dashboard_metric_number(product_item.item ->> 'quantidade') as quantidade,
      private.dashboard_metric_number(product_item.item ->> 'quantidade_retirada') as quantidade_retirada
    from pending_notas n
    cross join lateral jsonb_array_elements(n.produtos) as product_item(item)
  ),
  matched_items as (
    select
      pi.nota_id,
      greatest(0::numeric, pi.quantidade - pi.quantidade_retirada) * rp.fator as quantidade_pendente
    from product_items pi
    join related_products rp on rp.id_produto = pi.id_produto
  )
  select
    coalesce(count(distinct nota_id), 0)::integer,
    coalesce(round(sum(quantidade_pendente), 3), 0)
  into v_produto_10_notas, v_produto_10_pendente
  from matched_items;

  v_produto_10_percentual := case
    when v_produto_10_saldo > 0 then least(100, greatest(0, round((v_produto_10_pendente / v_produto_10_saldo) * 100)::integer))
    else 0
  end;

  insert into public.dashboard_metrics (
    id,
    total_notas,
    pendentes,
    parciais,
    retiradas,
    canceladas,
    pecas_compradas,
    pecas_entregues,
    pecas_pendentes,
    percentual_entrega,
    produto_10_id,
    produto_10_nome,
    produto_10_saldo_estoque,
    produto_10_notas_pendentes_com_produto,
    produto_10_quantidade_pendente_notas,
    produto_10_percentual_comprometido,
    produto_10_quantidade_filhos,
    updated_at
  )
  values (
    'global',
    v_total_notas,
    v_pendentes,
    v_parciais,
    v_retiradas,
    v_canceladas,
    v_pecas_compradas,
    v_pecas_entregues,
    v_pecas_pendentes,
    v_percentual_entrega,
    v_produto_10_id,
    v_produto_10_nome,
    round(v_produto_10_saldo, 3),
    v_produto_10_notas,
    round(v_produto_10_pendente, 3),
    v_produto_10_percentual,
    v_produto_10_filhos,
    now()
  )
  on conflict (id) do update set
    total_notas = excluded.total_notas,
    pendentes = excluded.pendentes,
    parciais = excluded.parciais,
    retiradas = excluded.retiradas,
    canceladas = excluded.canceladas,
    pecas_compradas = excluded.pecas_compradas,
    pecas_entregues = excluded.pecas_entregues,
    pecas_pendentes = excluded.pecas_pendentes,
    percentual_entrega = excluded.percentual_entrega,
    produto_10_id = excluded.produto_10_id,
    produto_10_nome = excluded.produto_10_nome,
    produto_10_saldo_estoque = excluded.produto_10_saldo_estoque,
    produto_10_notas_pendentes_com_produto = excluded.produto_10_notas_pendentes_com_produto,
    produto_10_quantidade_pendente_notas = excluded.produto_10_quantidade_pendente_notas,
    produto_10_percentual_comprometido = excluded.produto_10_percentual_comprometido,
    produto_10_quantidade_filhos = excluded.produto_10_quantidade_filhos,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function private.trigger_refresh_dashboard_metrics()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  perform private.refresh_dashboard_metrics();
  return null;
end;
$$;

revoke all on function private.dashboard_metric_number(text) from public, anon, authenticated;
revoke all on function private.refresh_dashboard_metrics() from public, anon, authenticated;
revoke all on function private.trigger_refresh_dashboard_metrics() from public, anon, authenticated;
grant execute on function private.refresh_dashboard_metrics() to service_role;

drop trigger if exists trg_refresh_dashboard_metrics_notas on public.notas_retirada;
create trigger trg_refresh_dashboard_metrics_notas
after insert or update or delete on public.notas_retirada
for each statement
execute function private.trigger_refresh_dashboard_metrics();

drop trigger if exists trg_refresh_dashboard_metrics_estoque on public.bd_estoque_geral;
create trigger trg_refresh_dashboard_metrics_estoque
after insert or update or delete on public.bd_estoque_geral
for each statement
execute function private.trigger_refresh_dashboard_metrics();

select private.refresh_dashboard_metrics();

commit;
