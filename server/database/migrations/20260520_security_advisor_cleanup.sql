-- Follow-up hardening to remove remaining security advisor warnings after the
-- broad lockdown migration.

begin;

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

alter function public.is_admin() set schema private;
alter function public.is_admin_or_colaborador() set schema private;
alter function public.is_gestor() set schema private;
alter function public.has_loja_access(uuid) set schema private;

grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_admin_or_colaborador() to anon, authenticated, service_role;
grant execute on function private.is_gestor() to anon, authenticated, service_role;
grant execute on function private.has_loja_access(uuid) to anon, authenticated, service_role;

do $$
declare
  table_name text;
  table_regclass regclass;
begin
  foreach table_name in array array[
    'dados_zincao',
    'documents',
    'historico_msg_zincao',
    'infornacoes_adicionais_rag',
    'message_buffer',
    'n8n_chat_formatador',
    'n8n_chat_memory',
    'n8n_fila_mensagens',
    'n8n_historico_mensagens',
    'n8n_status_atendimento',
    'system_prompt_ia',
    'teste',
    'todas_mensagens_whatsapp'
  ]
  loop
    table_regclass := to_regclass(format('public.%I', table_name));

    if table_regclass is not null then
      execute format('drop policy if exists no_client_access on %s', table_regclass);
      execute format(
        'create policy no_client_access on %s for all to anon, authenticated using (false) with check (false)',
        table_regclass
      );
    end if;
  end loop;
end;
$$;

commit;
