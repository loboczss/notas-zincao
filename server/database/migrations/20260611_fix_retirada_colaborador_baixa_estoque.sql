-- Garante que retiradas feitas por admin ou colaborador consigam baixar estoque.
-- Mantem a RPC como SECURITY INVOKER e deixa a permissao na policy RLS.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.has_active_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_uid = (select auth.uid())
      and lower(trim(coalesce(p.role, ''))) = any (allowed_roles)
      and p.deleted_at is null
  );
$$;

revoke all on function private.has_active_role(text[]) from public, anon;
grant execute on function private.has_active_role(text[]) to authenticated, service_role;

alter table public.bd_estoque_geral enable row level security;
alter table public.bd_estoque_geral force row level security;

revoke all on table public.bd_estoque_geral from anon;
grant select, insert, update, delete on public.bd_estoque_geral to authenticated;

drop policy if exists p_bd_estoque_geral_select_auth on public.bd_estoque_geral;
drop policy if exists p_bd_estoque_geral_update_admin on public.bd_estoque_geral;
drop policy if exists p_bd_estoque_geral_update_admin_colab on public.bd_estoque_geral;

create policy p_bd_estoque_geral_select_auth
on public.bd_estoque_geral
for select
to authenticated
using (true);

create policy p_bd_estoque_geral_update_admin_colab
on public.bd_estoque_geral
for update
to authenticated
using ((select private.has_active_role(array['admin', 'colaborador'])))
with check ((select private.has_active_role(array['admin', 'colaborador'])));

create or replace function public.baixar_estoque_produto(
  p_id_produto bigint,
  p_quantidade_solicitada numeric
)
returns table (
  quantidade_retirada numeric,
  estoque_restante numeric
)
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_estoque_atual numeric := 0;
  v_retirada numeric := 0;
begin
  if not private.has_active_role(array['admin', 'colaborador']) then
    raise exception 'Sem permissao para baixar estoque';
  end if;

  if p_id_produto is null then
    raise exception 'IDPRODUTO e obrigatorio';
  end if;

  if p_quantidade_solicitada is null or p_quantidade_solicitada <= 0 then
    return query
    select 0::numeric,
           coalesce((
             select e."QUANTIDADEESTOQUE"
             from public.bd_estoque_geral e
             where e."IDPRODUTO" = p_id_produto
             limit 1
           ), 0::numeric);
    return;
  end if;

  select coalesce(e."QUANTIDADEESTOQUE", 0)
    into v_estoque_atual
  from public.bd_estoque_geral e
  where e."IDPRODUTO" = p_id_produto
  for update;

  if not found then
    raise exception 'Produto % nao encontrado no estoque', p_id_produto;
  end if;

  v_retirada := least(v_estoque_atual, p_quantidade_solicitada);

  update public.bd_estoque_geral
  set "QUANTIDADEESTOQUE" = greatest(v_estoque_atual - v_retirada, 0)
  where "IDPRODUTO" = p_id_produto;

  return query
  select
    v_retirada,
    greatest(v_estoque_atual - v_retirada, 0);
end;
$$;

revoke all on function public.baixar_estoque_produto(bigint, numeric) from public, anon;
grant execute on function public.baixar_estoque_produto(bigint, numeric) to authenticated;

create or replace function private.baixar_stock_integrin_produto(
  p_idempresa integer,
  p_id_produto bigint,
  p_quantidade_solicitada numeric
)
returns table (
  quantidade_retirada numeric,
  estoque_restante numeric,
  idproduto integer,
  idsubproduto integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stock record;
  v_retirada numeric := 0;
  v_locais jsonb := '[]'::jsonb;
  v_novos_locais jsonb := '[]'::jsonb;
  v_local jsonb;
  v_local_atual numeric := 0;
  v_local_disponivel numeric := 0;
  v_local_baixa numeric := 0;
  v_restante_distribuir numeric := 0;
begin
  if not private.has_active_role(array['admin', 'colaborador']) then
    raise exception 'Sem permissao para baixar estoque';
  end if;

  if p_idempresa is null or p_idempresa <= 0 or p_id_produto is null then
    return query select 0::numeric, 0::numeric, null::integer, null::integer;
    return;
  end if;

  if p_quantidade_solicitada is null or p_quantidade_solicitada <= 0 then
    return query select 0::numeric, 0::numeric, null::integer, null::integer;
    return;
  end if;

  if p_id_produto = 10 then
    return query select 0::numeric, 0::numeric, null::integer, null::integer;
    return;
  end if;

  select
    s.id,
    s.idproduto,
    s.idsubproduto,
    coalesce(s.qtdsaldoatual, 0) as qtdsaldoatual,
    coalesce(s.qtdsaldodisponivel, 0) as qtdsaldodisponivel,
    coalesce(s.locais_estoque, '[]'::jsonb) as locais_estoque,
    coalesce(s.raw_saldo_estoque, '{}'::jsonb) as raw_saldo_estoque
  into v_stock
  from public.stock_integrin s
  where s.idempresa = p_idempresa
    and s.is_present = true
    and coalesce(s.flaginativo, 'F') = 'F'
    and (s.idproduto = p_id_produto or s.idsubproduto = p_id_produto)
    and s.idproduto <> 10
    and s.idsubproduto <> 10
    and lower(coalesce(s.descrcomproduto, '')) not like '%telha%zinco%'
    and lower(coalesce(s.descrcomproduto, '')) not like '%tela%zinco%'
  order by
    case
      when s.idproduto = p_id_produto and s.idsubproduto = p_id_produto then 0
      when s.idsubproduto = p_id_produto then 1
      when s.idproduto = p_id_produto then 2
      else 3
    end,
    s.qtdsaldodisponivel desc
  limit 1
  for update;

  if not found then
    return query select 0::numeric, 0::numeric, null::integer, null::integer;
    return;
  end if;

  v_retirada := least(greatest(v_stock.qtdsaldodisponivel, 0), p_quantidade_solicitada);

  if v_retirada <= 0 then
    return query
    select
      0::numeric,
      greatest(v_stock.qtdsaldodisponivel, 0),
      v_stock.idproduto::integer,
      v_stock.idsubproduto::integer;
    return;
  end if;

  v_locais := v_stock.locais_estoque;
  if jsonb_typeof(v_locais) <> 'array' then
    v_locais := '[]'::jsonb;
  end if;

  v_restante_distribuir := v_retirada;

  for v_local in select value from jsonb_array_elements(v_locais)
  loop
    v_local_atual := coalesce(nullif(v_local->>'qtdsaldoatual', '')::numeric, 0);
    v_local_disponivel := coalesce(nullif(v_local->>'qtdsaldodisponivel', '')::numeric, 0);
    v_local_baixa := least(greatest(v_local_disponivel, 0), v_restante_distribuir);

    if v_local_baixa > 0 then
      v_local := jsonb_set(
        v_local,
        '{qtdsaldodisponivel}',
        to_jsonb(greatest(v_local_disponivel - v_local_baixa, 0)),
        true
      );
      v_local := jsonb_set(
        v_local,
        '{qtdsaldoatual}',
        to_jsonb(greatest(v_local_atual - v_local_baixa, 0)),
        true
      );
      v_restante_distribuir := greatest(v_restante_distribuir - v_local_baixa, 0);
    end if;

    v_novos_locais := v_novos_locais || jsonb_build_array(v_local);
  end loop;

  update public.stock_integrin
  set
    qtdsaldodisponivel = greatest(v_stock.qtdsaldodisponivel - v_retirada, 0),
    qtdsaldoatual = greatest(v_stock.qtdsaldoatual - v_retirada, 0),
    locais_estoque = case
      when jsonb_array_length(v_locais) > 0 then v_novos_locais
      else v_locais
    end,
    raw_saldo_estoque = case
      when jsonb_array_length(v_locais) > 0 then jsonb_set(v_stock.raw_saldo_estoque, '{locais}', v_novos_locais, true)
      else v_stock.raw_saldo_estoque
    end,
    updated_at = now()
  where id = v_stock.id;

  update public.stock_integrin_summary
  set
    saldo_disponivel_total = greatest(saldo_disponivel_total - v_retirada, 0),
    updated_at = now()
  where id = true;

  return query
  select
    v_retirada,
    greatest(v_stock.qtdsaldodisponivel - v_retirada, 0),
    v_stock.idproduto::integer,
    v_stock.idsubproduto::integer;
end;
$$;

revoke all on function private.baixar_stock_integrin_produto(integer, bigint, numeric) from public, anon;
grant execute on function private.baixar_stock_integrin_produto(integer, bigint, numeric) to authenticated, service_role;

create or replace function public.baixar_stock_integrin_produto(
  p_idempresa integer,
  p_id_produto bigint,
  p_quantidade_solicitada numeric
)
returns table (
  quantidade_retirada numeric,
  estoque_restante numeric,
  idproduto integer,
  idsubproduto integer
)
language sql
security invoker
set search_path = private, public, pg_temp
as $$
  select *
  from private.baixar_stock_integrin_produto(
    p_idempresa,
    p_id_produto,
    p_quantidade_solicitada
  );
$$;

revoke all on function public.baixar_stock_integrin_produto(integer, bigint, numeric) from public, anon;
grant execute on function public.baixar_stock_integrin_produto(integer, bigint, numeric) to authenticated;

do $$
begin
  if to_regclass('public.retirada_idempotency') is not null then
    execute 'alter table public.retirada_idempotency enable row level security';
    execute 'alter table public.retirada_idempotency force row level security';

    execute 'revoke all on table public.retirada_idempotency from anon';
    execute 'revoke all on table public.retirada_idempotency from authenticated';
    execute 'grant select, insert on public.retirada_idempotency to authenticated';

    execute 'drop policy if exists p_retirada_idempotency_admin_colaborador on public.retirada_idempotency';

    execute $policy$
      create policy p_retirada_idempotency_admin_colaborador
      on public.retirada_idempotency
      for all
      to authenticated
      using ((select private.has_active_role(array['admin', 'colaborador'])))
      with check ((select private.has_active_role(array['admin', 'colaborador'])))
    $policy$;
  end if;
end;
$$;

commit;
