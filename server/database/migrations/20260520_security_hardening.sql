-- Security hardening for the live Supabase project.
--
-- Important operational note:
-- The n8n/RAG/chat tables below currently contain real data and were exposed
-- in the public schema with RLS disabled. Enabling RLS and revoking anon/
-- authenticated access is the correct security posture, but n8n workflows must
-- use the service role key or a dedicated server-side integration after this.

begin;

-- ---------------------------------------------------------------------------
-- 1) Shared role helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
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
      and lower(trim(coalesce(p.role, ''))) = 'admin'
      and p.deleted_at is null
  );
$$;

create or replace function public.is_admin_or_colaborador()
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
      and lower(trim(coalesce(p.role, ''))) in ('admin', 'colaborador')
      and p.deleted_at is null
  );
$$;

alter function public.is_gestor() set search_path = public, pg_temp;
alter function public.has_loja_access(uuid) set search_path = public, pg_temp;
alter function public.handle_updated_at() set search_path = public, pg_temp;
alter function public.log_nota_edicao() set search_path = public, pg_temp;
alter function public.check_user_role_before_insert_nota() set search_path = public, pg_temp;
alter function public.check_notas_produtos_update() set search_path = public, pg_temp;
alter function public.trg_bd_estoque_geral_atualizado_em() set search_path = public, pg_temp;
alter function public.set_timestamp_atualizado_em() set search_path = public, pg_temp;
alter function public.match_documents(vector, double precision, integer, jsonb) set search_path = public, pg_temp;
alter function public.hybrid_search(text, vector, integer, double precision, double precision, integer) set search_path = public, pg_temp;

revoke all on function public.check_user_role_before_insert_nota() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_updated_at() from public, anon, authenticated;
revoke all on function public.handle_user_login() from public, anon, authenticated;
revoke all on function public.log_nota_edicao() from public, anon, authenticated;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    alter extension pg_trgm set schema extensions;
  end if;
end;
$$;

-- This function is called from the app as the signed-in user. It does not need
-- SECURITY DEFINER because bd_estoque_geral already has RLS update policies for
-- admin/colaborador, and the function also checks that role explicitly.
alter function public.baixar_estoque_produto(bigint, numeric) security invoker;
alter function public.baixar_estoque_produto(bigint, numeric) set search_path = public, pg_temp;
revoke all on function public.baixar_estoque_produto(bigint, numeric) from public, anon;
grant execute on function public.baixar_estoque_produto(bigint, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Notes and profile policies
-- ---------------------------------------------------------------------------

alter table public.notas_retirada enable row level security;
alter table public.notas_retirada force row level security;

drop policy if exists notas_retirada_select_owner on public.notas_retirada;
drop policy if exists notas_retirada_select_admin_colab on public.notas_retirada;
drop policy if exists notas_retirada_update_owner on public.notas_retirada;
drop policy if exists notas_retirada_update_admin_colab on public.notas_retirada;
drop policy if exists notas_retirada_delete_owner on public.notas_retirada;
drop policy if exists notas_retirada_delete_admin on public.notas_retirada;
drop policy if exists notas_retirada_insert_owner on public.notas_retirada;

create policy notas_retirada_select_access
on public.notas_retirada
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or public.is_admin_or_colaborador()
);

create policy notas_retirada_insert_owner
on public.notas_retirada
for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

create policy notas_retirada_update_admin_colab
on public.notas_retirada
for update
to authenticated
using (public.is_admin_or_colaborador())
with check (public.is_admin_or_colaborador());

create policy notas_retirada_delete_admin
on public.notas_retirada
for delete
to authenticated
using (public.is_admin());

alter table public.notas_historico_edicao enable row level security;
alter table public.notas_historico_edicao force row level security;

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
        or public.is_admin_or_colaborador()
      )
  )
);

create policy notas_historico_edicao_insert_access
on public.notas_historico_edicao
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.notas_retirada n
    where n.id = notas_historico_edicao.nota_id
      and public.is_admin_or_colaborador()
  )
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;
drop policy if exists profiles_insert on public.profiles;

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
using (auth_uid = (select auth.uid()) or public.is_admin())
with check (auth_uid = (select auth.uid()) or public.is_admin());

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
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

-- ---------------------------------------------------------------------------
-- 3) Storage listing hardening
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read cupons" on storage.objects;
drop policy if exists notas_retirada_storage_select on storage.objects;

update storage.buckets
set public = false
where id in ('notas-retirada', 'cupons');

create policy notas_retirada_storage_select_own_folder
on storage.objects
for select
to authenticated
using (
  bucket_id = 'notas-retirada'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_admin_or_colaborador()
  )
);

create policy cupons_storage_select_own_folder
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cupons'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_admin_or_colaborador()
  )
);

-- ---------------------------------------------------------------------------
-- 4) RLS lockdown for exposed public automation/RAG tables
-- ---------------------------------------------------------------------------

alter table public.documents enable row level security;
alter table public.n8n_historico_mensagens enable row level security;
alter table public.historico_msg_zincao enable row level security;
alter table public.teste enable row level security;
alter table public.todas_mensagens_whatsapp enable row level security;
alter table public.system_prompt_ia enable row level security;
alter table public.message_buffer enable row level security;
alter table public.n8n_chat_memory enable row level security;
alter table public.n8n_fila_mensagens enable row level security;
alter table public.n8n_status_atendimento enable row level security;
alter table public.n8n_chat_formatador enable row level security;

alter table public.documents force row level security;
alter table public.n8n_historico_mensagens force row level security;
alter table public.historico_msg_zincao force row level security;
alter table public.teste force row level security;
alter table public.todas_mensagens_whatsapp force row level security;
alter table public.system_prompt_ia force row level security;
alter table public.message_buffer force row level security;
alter table public.n8n_chat_memory force row level security;
alter table public.n8n_fila_mensagens force row level security;
alter table public.n8n_status_atendimento force row level security;
alter table public.n8n_chat_formatador force row level security;

revoke all on table public.documents from anon, authenticated;
revoke all on table public.n8n_historico_mensagens from anon, authenticated;
revoke all on table public.historico_msg_zincao from anon, authenticated;
revoke all on table public.teste from anon, authenticated;
revoke all on table public.todas_mensagens_whatsapp from anon, authenticated;
revoke all on table public.system_prompt_ia from anon, authenticated;
revoke all on table public.message_buffer from anon, authenticated;
revoke all on table public.n8n_chat_memory from anon, authenticated;
revoke all on table public.n8n_fila_mensagens from anon, authenticated;
revoke all on table public.n8n_status_atendimento from anon, authenticated;
revoke all on table public.n8n_chat_formatador from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Performance indexes from Supabase advisors
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

commit;
