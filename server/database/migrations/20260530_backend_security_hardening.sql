-- Backend security hardening for Notas Zincao.
-- This migration drops only verified-empty unused public tables. Legacy tables
-- that still contain rows are retained but locked down with RLS and no client
-- access policy until they can be archived explicitly.

begin;

-- ---------------------------------------------------------------------------
-- 1) Private role helper for RLS policies
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 2) Preflight for destructive cleanup
-- ---------------------------------------------------------------------------

do $$
declare
  table_name text;
  row_count bigint;
  drop_tables text[] := array[
    'n8n_fila_mensagens',
    'lojas',
    'produtos',
    'usuarios_lojas',
    'uploads_lote',
    'xmls_processados',
    'movimento_estoque',
    'sincronizacoes',
    'snapshots_estoque',
    'audit_log',
    'sispoder_configuracoes'
  ];
begin
  foreach table_name in array drop_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('select count(*) from public.%I', table_name) into row_count;

      if row_count > 0 then
        raise exception 'Refusing to drop public.% because it has % rows', table_name, row_count;
      end if;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Kept public tables: RLS, grants, and consolidated policies
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
revoke all on table public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists profiles_update_own_or_admin on public.profiles;
drop policy if exists profiles_delete on public.profiles;

create policy profiles_select_authenticated
on public.profiles
for select
to authenticated
using (true);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth_uid = (select auth.uid()));

create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (
  auth_uid = (select auth.uid())
  or (select private.has_active_role(array['admin']))
)
with check (
  auth_uid = (select auth.uid())
  or (select private.has_active_role(array['admin']))
);

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if private.has_active_role(array['admin']) then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.auth_uid is distinct from old.auth_uid
    or new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.workspaces is distinct from old.workspaces
    or new.deleted_at is distinct from old.deleted_at
    or new.deleted_by is distinct from old.deleted_by
    or new.updated_by is distinct from old.updated_by
  then
    raise exception 'Sem permissao para alterar campos administrativos do perfil';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_privilege_escalation on public.profiles;
create trigger trg_prevent_profile_privilege_escalation
before update on public.profiles
for each row
execute function public.prevent_profile_privilege_escalation();

revoke all on function public.prevent_profile_privilege_escalation() from public, anon, authenticated;

alter table public.notas_retirada enable row level security;
alter table public.notas_retirada force row level security;
revoke all on table public.notas_retirada from anon;
grant select, insert, update, delete on public.notas_retirada to authenticated;

drop policy if exists notas_retirada_select_owner on public.notas_retirada;
drop policy if exists notas_retirada_select_admin_colab on public.notas_retirada;
drop policy if exists notas_retirada_select_access on public.notas_retirada;
drop policy if exists notas_retirada_insert_owner on public.notas_retirada;
drop policy if exists notas_retirada_update_owner on public.notas_retirada;
drop policy if exists notas_retirada_update_admin_colab on public.notas_retirada;
drop policy if exists notas_retirada_delete_owner on public.notas_retirada;
drop policy if exists notas_retirada_delete_admin on public.notas_retirada;

create policy notas_retirada_select_access
on public.notas_retirada
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or (select private.has_active_role(array['admin', 'colaborador']))
);

create policy notas_retirada_insert_owner
on public.notas_retirada
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and (select private.has_active_role(array['admin', 'colaborador', 'vendedor']))
);

create policy notas_retirada_update_admin_colab
on public.notas_retirada
for update
to authenticated
using ((select private.has_active_role(array['admin', 'colaborador'])))
with check ((select private.has_active_role(array['admin', 'colaborador'])));

create policy notas_retirada_delete_admin
on public.notas_retirada
for delete
to authenticated
using ((select private.has_active_role(array['admin'])));

alter table public.notas_historico_edicao enable row level security;
alter table public.notas_historico_edicao force row level security;
revoke all on table public.notas_historico_edicao from anon;
grant select, insert on public.notas_historico_edicao to authenticated;

drop policy if exists "Usuarios autenticados podem ver historico" on public.notas_historico_edicao;
drop policy if exists notas_historico_edicao_select_access on public.notas_historico_edicao;
drop policy if exists notas_historico_edicao_insert_access on public.notas_historico_edicao;

create policy notas_historico_edicao_select_access
on public.notas_historico_edicao
for select
to authenticated
using (
  exists (
    select 1
    from public.notas_retirada n
    where n.id = notas_historico_edicao.nota_id
      and (
        n.owner_user_id = (select auth.uid())
        or (select private.has_active_role(array['admin', 'colaborador']))
      )
  )
);

create policy notas_historico_edicao_insert_access
on public.notas_historico_edicao
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.has_active_role(array['admin', 'colaborador']))
);

alter table public.bd_estoque_geral enable row level security;
alter table public.bd_estoque_geral force row level security;
revoke all on table public.bd_estoque_geral from anon;
grant select, insert, update, delete on public.bd_estoque_geral to authenticated;

drop policy if exists p_bd_estoque_geral_select_auth on public.bd_estoque_geral;
drop policy if exists p_bd_estoque_geral_insert_admin on public.bd_estoque_geral;
drop policy if exists p_bd_estoque_geral_update_admin on public.bd_estoque_geral;
drop policy if exists p_bd_estoque_geral_delete_admin on public.bd_estoque_geral;

create policy p_bd_estoque_geral_select_auth
on public.bd_estoque_geral
for select
to authenticated
using (true);

create policy p_bd_estoque_geral_insert_admin
on public.bd_estoque_geral
for insert
to authenticated
with check ((select private.has_active_role(array['admin'])));

create policy p_bd_estoque_geral_update_admin_colab
on public.bd_estoque_geral
for update
to authenticated
using ((select private.has_active_role(array['admin', 'colaborador'])))
with check ((select private.has_active_role(array['admin', 'colaborador'])));

create policy p_bd_estoque_geral_delete_admin
on public.bd_estoque_geral
for delete
to authenticated
using ((select private.has_active_role(array['admin'])));

alter table public.crm_zincao enable row level security;
alter table public.crm_zincao force row level security;
revoke all on table public.crm_zincao from anon;
grant select, insert, update on public.crm_zincao to authenticated;

drop policy if exists "Permitir leitura para autenticados" on public.crm_zincao;
drop policy if exists "Permitir insercao para autenticados" on public.crm_zincao;
drop policy if exists "Permitir inserção para autenticados" on public.crm_zincao;
drop policy if exists "Permitir atualizacao para autenticados" on public.crm_zincao;
drop policy if exists "Permitir atualização para autenticados" on public.crm_zincao;
drop policy if exists crm_zincao_select_active_role on public.crm_zincao;
drop policy if exists crm_zincao_insert_active_role on public.crm_zincao;
drop policy if exists crm_zincao_update_active_role on public.crm_zincao;

create policy crm_zincao_select_active_role
on public.crm_zincao
for select
to authenticated
using ((select private.has_active_role(array['admin', 'colaborador', 'vendedor'])));

create policy crm_zincao_insert_active_role
on public.crm_zincao
for insert
to authenticated
with check ((select private.has_active_role(array['admin', 'colaborador', 'vendedor'])));

create policy crm_zincao_update_active_role
on public.crm_zincao
for update
to authenticated
using ((select private.has_active_role(array['admin', 'colaborador', 'vendedor'])))
with check ((select private.has_active_role(array['admin', 'colaborador', 'vendedor'])));

alter table public.retirada_idempotency enable row level security;
alter table public.retirada_idempotency force row level security;
revoke all on table public.retirada_idempotency from anon;
grant select, insert, update, delete on public.retirada_idempotency to authenticated;

drop policy if exists p_retirada_idempotency_admin_colaborador on public.retirada_idempotency;

create policy p_retirada_idempotency_admin_colaborador
on public.retirada_idempotency
for all
to authenticated
using ((select private.has_active_role(array['admin', 'colaborador'])))
with check ((select private.has_active_role(array['admin', 'colaborador'])));

-- ---------------------------------------------------------------------------
-- 4) Legacy public tables with retained data: RLS lockdown
-- ---------------------------------------------------------------------------

do $$
declare
  legacy_table text;
  policy_record record;
  legacy_tables text[] := array[
    'bd_matriz',
    'dados_zincao',
    'documents',
    'historico_msg_zincao',
    'historico_vendas_zincao',
    'infornacoes_adicionais_rag',
    'message_buffer',
    'n8n_chat_formatador',
    'n8n_chat_memory',
    'n8n_historico_mensagens',
    'n8n_status_atendimento',
    'system_prompt_ia',
    'teste',
    'todas_mensagens_whatsapp'
  ];
begin
  foreach legacy_table in array legacy_tables loop
    if to_regclass(format('public.%I', legacy_table)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', legacy_table);
    execute format('alter table public.%I force row level security', legacy_table);
    execute format('revoke all on table public.%I from anon, authenticated', legacy_table);

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = legacy_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_record.policyname, legacy_table);
    end loop;

    execute format(
      'create policy no_client_access on public.%I for all to anon, authenticated using (false) with check (false)',
      legacy_table
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) RPC/function hardening
-- ---------------------------------------------------------------------------

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

revoke all on function public.baixar_estoque_produto(bigint, numeric) from public, anon, authenticated;
grant execute on function public.baixar_estoque_produto(bigint, numeric) to authenticated;

do $$
declare
  fn oid;
  signatures text[] := array[
    'public.check_user_role_before_insert_nota()',
    'public.handle_new_auth_user()',
    'public.handle_new_user()',
    'public.handle_updated_at()',
    'public.handle_user_login()',
    'public.log_nota_edicao()'
  ];
  signature text;
begin
  foreach signature in array signatures loop
    fn := to_regprocedure(signature);
    if fn is not null then
      execute format('revoke all on function %s from public, anon, authenticated', fn::regprocedure);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Private storage buckets and scoped object policies
-- ---------------------------------------------------------------------------

update storage.buckets
set public = false
where id in ('notas-retirada', 'cupons');

drop policy if exists "Authenticated users can read cupons" on storage.objects;
drop policy if exists "Authenticated users can upload cupons" on storage.objects;
drop policy if exists "Users can update their own cupons" on storage.objects;
drop policy if exists cupons_storage_select_own_folder on storage.objects;
drop policy if exists cupons_storage_insert_own_folder on storage.objects;
drop policy if exists cupons_storage_update_admin_colab on storage.objects;
drop policy if exists cupons_storage_delete_admin_colab on storage.objects;

drop policy if exists notas_retirada_storage_select on storage.objects;
drop policy if exists notas_retirada_storage_insert on storage.objects;
drop policy if exists notas_retirada_storage_update on storage.objects;
drop policy if exists notas_retirada_storage_delete on storage.objects;
drop policy if exists notas_retirada_storage_select_own_folder on storage.objects;
drop policy if exists notas_retirada_storage_insert_own_folder on storage.objects;
drop policy if exists notas_retirada_storage_update_admin_colab on storage.objects;
drop policy if exists notas_retirada_storage_delete_admin_colab on storage.objects;

create policy notas_retirada_storage_select_own_folder
on storage.objects
for select
to authenticated
using (
  bucket_id = 'notas-retirada'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.has_active_role(array['admin', 'colaborador']))
  )
);

create policy notas_retirada_storage_insert_own_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'notas-retirada'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and (select private.has_active_role(array['admin', 'colaborador', 'vendedor']))
    )
    or (select private.has_active_role(array['admin', 'colaborador']))
  )
);

create policy notas_retirada_storage_update_admin_colab
on storage.objects
for update
to authenticated
using (
  bucket_id = 'notas-retirada'
  and (select private.has_active_role(array['admin', 'colaborador']))
)
with check (
  bucket_id = 'notas-retirada'
  and (select private.has_active_role(array['admin', 'colaborador']))
);

create policy notas_retirada_storage_delete_admin_colab
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'notas-retirada'
  and (select private.has_active_role(array['admin', 'colaborador']))
);

create policy cupons_storage_select_own_folder
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cupons'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.has_active_role(array['admin', 'colaborador']))
  )
);

create policy cupons_storage_insert_own_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cupons'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and (select private.has_active_role(array['admin', 'colaborador', 'vendedor']))
    )
    or (select private.has_active_role(array['admin', 'colaborador']))
  )
);

create policy cupons_storage_update_admin_colab
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cupons'
  and (select private.has_active_role(array['admin', 'colaborador']))
)
with check (
  bucket_id = 'cupons'
  and (select private.has_active_role(array['admin', 'colaborador']))
);

create policy cupons_storage_delete_admin_colab
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cupons'
  and (select private.has_active_role(array['admin', 'colaborador']))
);

-- ---------------------------------------------------------------------------
-- 7) Performance advisor indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_bd_estoque_geral_idprodutopai
on public.bd_estoque_geral ("IDPRODUTOPAI");

create index if not exists idx_notas_historico_edicao_nota_id
on public.notas_historico_edicao (nota_id);

create index if not exists idx_notas_historico_edicao_user_id
on public.notas_historico_edicao (user_id);

create index if not exists idx_notas_retirada_deleted_by
on public.notas_retirada (deleted_by);

create index if not exists idx_notas_retirada_retirada_confirmada_por
on public.notas_retirada (retirada_confirmada_por);

-- ---------------------------------------------------------------------------
-- 8) Drop verified-empty public tables and public helper duplicates
-- ---------------------------------------------------------------------------

do $$
declare
  policy_record record;
  drop_tables text[] := array[
    'n8n_fila_mensagens',
    'lojas',
    'produtos',
    'usuarios_lojas',
    'uploads_lote',
    'xmls_processados',
    'movimento_estoque',
    'sincronizacoes',
    'snapshots_estoque',
    'audit_log',
    'sispoder_configuracoes'
  ];
begin
  for policy_record in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (drop_tables)
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end;
$$;

do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('match_documents', 'hybrid_search', 'has_loja_access', 'is_gestor')
  loop
    execute format('drop function if exists %s', function_record.signature);
  end loop;
end;
$$;

drop table if exists
  public.n8n_fila_mensagens,
  public.lojas,
  public.produtos,
  public.usuarios_lojas,
  public.uploads_lote,
  public.xmls_processados,
  public.movimento_estoque,
  public.sincronizacoes,
  public.snapshots_estoque,
  public.audit_log,
  public.sispoder_configuracoes;

drop function if exists public.is_admin();
drop function if exists public.is_admin_or_colaborador();

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    create schema if not exists extensions;
    grant usage on schema extensions to anon, authenticated, service_role;
    alter extension pg_trgm set schema extensions;
  end if;
end;
$$;

commit;
