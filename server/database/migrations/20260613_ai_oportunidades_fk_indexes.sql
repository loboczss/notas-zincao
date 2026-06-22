create index if not exists compra_eventos_contexto_task_run_idx
  on public.compra_eventos_contexto (task_run_id);

create index if not exists compra_oportunidades_ia_task_run_idx
  on public.compra_oportunidades_ia (task_run_id);
