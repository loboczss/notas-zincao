create schema if not exists private;

create or replace function private.prevent_profile_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  raise exception 'Perfis devem ser inativados via deleted_at; hard delete bloqueado para preservar dados vinculados';
end;
$$;

drop trigger if exists trg_prevent_profile_hard_delete on public.profiles;
create trigger trg_prevent_profile_hard_delete
before delete on public.profiles
for each row
execute function private.prevent_profile_hard_delete();

revoke all on function private.prevent_profile_hard_delete() from public, anon, authenticated;

create or replace function private.prevent_notas_retirada_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  raise exception 'Notas de retirada devem ser excluidas via soft delete (deleted_at); hard delete bloqueado';
end;
$$;

drop trigger if exists trg_prevent_notas_retirada_hard_delete on public.notas_retirada;
create trigger trg_prevent_notas_retirada_hard_delete
before delete on public.notas_retirada
for each row
execute function private.prevent_notas_retirada_hard_delete();

revoke all on function private.prevent_notas_retirada_hard_delete() from public, anon, authenticated;

do $$
declare
  fk record;
begin
  for fk in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where con.contype = 'f'
      and nsp.nspname = 'public'
      and rel.relname = 'profiles'
      and con.confrelid = 'auth.users'::regclass
      and exists (
        select 1
        from unnest(con.conkey) with ordinality as cols(attnum, ord)
        join pg_attribute attr on attr.attrelid = con.conrelid and attr.attnum = cols.attnum
        where attr.attname = 'auth_uid'
      )
  loop
    execute format('alter table public.profiles drop constraint %I', fk.conname);
    execute format(
      'alter table public.profiles add constraint %I foreign key (auth_uid) references auth.users(id) on delete restrict',
      fk.conname
    );
  end loop;
end;
$$;
