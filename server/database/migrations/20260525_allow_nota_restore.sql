-- Permite restaurar notas da lixeira.
-- A restauracao continua restrita a administradores autenticados.
-- A auditoria fica a cargo do trigger public.log_nota_edicao().

begin;

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
  is_deleting boolean;
  is_restoring boolean;
begin
  soft_delete_changed :=
    new.deleted_at is distinct from old.deleted_at
    or new.deleted_by is distinct from old.deleted_by;

  if not soft_delete_changed then
    return new;
  end if;

  if actor_uid is null then
    raise exception 'Usuario autenticado obrigatorio para alterar exclusao de notas.'
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
    raise exception 'Apenas administradores podem alterar exclusao de notas.'
      using errcode = '42501';
  end if;

  is_deleting := old.deleted_at is null and new.deleted_at is not null;
  is_restoring := old.deleted_at is not null and new.deleted_at is null and new.deleted_by is null;

  if is_deleting then
    if new.deleted_by is distinct from actor_uid then
      raise exception 'deleted_by deve ser o administrador autenticado.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if is_restoring then
    return new;
  end if;

  raise exception 'Alteracao invalida dos campos de exclusao da nota.'
    using errcode = '23514';
end;
$$;

revoke all on function private.guard_notas_retirada_soft_delete() from public, anon, authenticated;

create or replace function public.restaurar_nota_retirada(p_nota_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  actor_uid uuid := (select auth.uid());
  nota_atual public.notas_retirada%rowtype;
  nota_restaurada public.notas_retirada%rowtype;
  restored_at timestamptz := now();
begin
  if actor_uid is null then
    raise exception 'Usuario autenticado obrigatorio para restaurar notas.'
      using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Apenas administradores podem restaurar notas.'
      using errcode = '42501';
  end if;

  select *
  into nota_atual
  from public.notas_retirada
  where id = p_nota_id
  for update;

  if not found then
    raise exception 'Nota nao encontrada.'
      using errcode = 'P0002';
  end if;

  if nota_atual.deleted_at is null then
    raise exception 'Esta nota nao esta na lixeira.'
      using errcode = '23514';
  end if;

  update public.notas_retirada
  set
    deleted_at = null,
    deleted_by = null,
    atualizado_em = restored_at
  where id = p_nota_id
    and deleted_at is not null
  returning *
  into nota_restaurada;

  if not found then
    raise exception 'A nota ja foi restaurada por outra sessao.'
      using errcode = '23514';
  end if;

  return to_jsonb(nota_restaurada);
end;
$$;

revoke all on function public.restaurar_nota_retirada(uuid) from public, anon;
grant execute on function public.restaurar_nota_retirada(uuid) to authenticated;

commit;
