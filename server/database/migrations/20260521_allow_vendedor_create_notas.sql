begin;

-- Allow the note creation trigger to accept all active business roles that may
-- register notes from the app. This keeps edit/delete permissions unchanged.
create or replace function public.check_user_role_before_insert_nota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_role text;
begin
  select lower(trim(coalesce(p.role, '')))
  into current_role
  from public.profiles p
  where p.auth_uid = (select auth.uid())
    and p.deleted_at is null
  limit 1;

  if current_role not in ('admin', 'colaborador', 'vendedor') then
    raise exception 'Sem permissao para cadastrar nota'
      using errcode = '42501';
  end if;

  if new.owner_user_id is distinct from (select auth.uid()) then
    raise exception 'owner_user_id deve ser o usuario autenticado'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.check_user_role_before_insert_nota() from public, anon, authenticated;

drop policy if exists notas_retirada_insert_owner on public.notas_retirada;
create policy notas_retirada_insert_owner
on public.notas_retirada
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.auth_uid = (select auth.uid())
      and p.deleted_at is null
      and lower(trim(coalesce(p.role, ''))) in ('admin', 'colaborador', 'vendedor')
  )
);

commit;
