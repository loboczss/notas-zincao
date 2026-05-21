-- Protect note soft-delete fields from direct client updates.
-- The API already validates admin access, but this trigger keeps the same
-- rule inside Postgres for Supabase Data API or any other authenticated path.

begin;

create schema if not exists private;

create or replace function private.guard_notas_retirada_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  actor_uid uuid := (select auth.uid());
  actor_is_admin boolean := false;
  soft_delete_changed boolean;
begin
  soft_delete_changed :=
    new.deleted_at is distinct from old.deleted_at
    or new.deleted_by is distinct from old.deleted_by;

  if not soft_delete_changed then
    return new;
  end if;

  if actor_uid is null then
    raise exception 'Usuario autenticado obrigatorio para excluir notas.'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.auth_uid = actor_uid
      and lower(trim(coalesce(p.role, ''))) = 'admin'
      and p.deleted_at is null
  )
  into actor_is_admin;

  if not actor_is_admin then
    raise exception 'Apenas administradores podem excluir notas.'
      using errcode = '42501';
  end if;

  if old.deleted_at is not null then
    raise exception 'Esta nota ja foi excluida.'
      using errcode = '23514';
  end if;

  if new.deleted_at is null then
    raise exception 'Restauracao de nota excluida nao e permitida por este fluxo.'
      using errcode = '23514';
  end if;

  if new.deleted_by is distinct from actor_uid then
    raise exception 'deleted_by deve ser o administrador autenticado.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_notas_retirada_soft_delete() from public, anon, authenticated;

drop trigger if exists trg_guard_notas_retirada_soft_delete on public.notas_retirada;

create trigger trg_guard_notas_retirada_soft_delete
before update of deleted_at, deleted_by on public.notas_retirada
for each row
execute function private.guard_notas_retirada_soft_delete();

create index if not exists idx_notas_retirada_deleted_at
on public.notas_retirada (deleted_at)
where deleted_at is not null;

commit;
