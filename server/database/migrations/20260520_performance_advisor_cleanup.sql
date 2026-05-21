-- Low-risk performance fixes from Supabase advisors.

begin;

create or replace function private.is_admin()
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

create or replace function private.is_admin_or_colaborador()
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

create or replace function private.is_gestor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.usuarios_lojas ul
    where ul.user_id = (select auth.uid())
      and ul.papel = 'gestor'
  );
$$;

create or replace function private.has_loja_access(target_loja_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.usuarios_lojas ul
    where ul.user_id = (select auth.uid())
      and (ul.loja_id = target_loja_id or ul.papel = 'gestor')
  );
$$;

drop policy if exists "Permitir leitura para autenticados" on public.crm_zincao;
drop policy if exists "Permitir inserção para autenticados" on public.crm_zincao;
drop policy if exists "Permitir atualização para autenticados" on public.crm_zincao;

create policy "Permitir leitura para autenticados"
on public.crm_zincao
for select
to authenticated
using (true);

create policy "Permitir inserção para autenticados"
on public.crm_zincao
for insert
to authenticated
with check (true);

create policy "Permitir atualização para autenticados"
on public.crm_zincao
for update
to authenticated
using (true);

drop policy if exists "Permitir leitura vendas para autenticados" on public.historico_vendas_zincao;
create policy "Permitir leitura vendas para autenticados"
on public.historico_vendas_zincao
for select
to authenticated
using (true);

drop policy if exists usuarios_lojas_select_proprio_ou_gestor on public.usuarios_lojas;
create policy usuarios_lojas_select_proprio_ou_gestor
on public.usuarios_lojas
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_gestor())
);

drop policy if exists audit_log_select_gestor_ou_proprio on public.audit_log;
create policy audit_log_select_gestor_ou_proprio
on public.audit_log
for select
to authenticated
using (
  (select private.is_gestor())
  or usuario_id = (select auth.uid())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bd_estoque_geral_pkey'
      and conrelid = 'public.bd_estoque_geral'::regclass
  ) then
    alter table public.bd_estoque_geral
    add constraint bd_estoque_geral_pkey primary key ("IDPRODUTO");
  end if;
end;
$$;

commit;
