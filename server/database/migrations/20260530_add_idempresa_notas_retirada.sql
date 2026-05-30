begin;

alter table public.notas_retirada
  add column if not exists idempresa smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notas_retirada_idempresa_check'
      and conrelid = 'public.notas_retirada'::regclass
  ) then
    alter table public.notas_retirada
      add constraint notas_retirada_idempresa_check
      check (idempresa is null or idempresa between 1 and 6);
  end if;
end $$;

create index if not exists idx_notas_retirada_idempresa
  on public.notas_retirada (idempresa)
  where idempresa is not null;

commit;
