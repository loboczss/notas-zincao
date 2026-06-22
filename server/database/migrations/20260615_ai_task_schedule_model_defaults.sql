-- Defaults para a configuracao por cliques das tasks de IA.
-- Os campos novos ficam em params jsonb para manter compatibilidade com a tabela existente.

alter table public.ai_compra_tasks
  alter column params set default jsonb_build_object(
    'region', 'Brasil',
    'model', 'gpt-5.4-mini',
    'min_confidence', 0.62,
    'max_opportunities', 20,
    'sources', jsonb_build_array('clima', 'cidade', 'esporte', 'feriado', 'obra', 'tendencia', 'fornecedor'),
    'schedule', jsonb_build_object(
      'mode', 'daily',
      'times', jsonb_build_array('09:15', '19:15'),
      'weekdays', jsonb_build_array(1, 2, 3, 4, 5),
      'month_day', 1,
      'year_month', 1,
      'year_day', 1,
      'crons', jsonb_build_array('15 9 * * *', '15 19 * * *')
    )
  );

alter table public.ai_compra_tasks
  drop constraint if exists ai_compra_tasks_params_object_chk;

alter table public.ai_compra_tasks
  add constraint ai_compra_tasks_params_object_chk
  check (jsonb_typeof(params) = 'object');

with defaults as (
  select
    jsonb_build_object(
      'region', 'Brasil',
      'model', 'gpt-5.4-mini',
      'min_confidence', 0.62,
      'max_opportunities', 20,
      'sources', jsonb_build_array('clima', 'cidade', 'esporte', 'feriado', 'obra', 'tendencia', 'fornecedor')
    ) as base_params,
    jsonb_build_object(
      'mode', 'daily',
      'times', jsonb_build_array('09:15', '19:15'),
      'weekdays', jsonb_build_array(1, 2, 3, 4, 5),
      'month_day', 1,
      'year_month', 1,
      'year_day', 1,
      'crons', jsonb_build_array('15 9 * * *', '15 19 * * *')
    ) as schedule_params
)
update public.ai_compra_tasks task
set
  params = jsonb_set(
    defaults.base_params || coalesce(task.params, '{}'::jsonb),
    '{schedule}',
    defaults.schedule_params || coalesce(task.params -> 'schedule', '{}'::jsonb),
    true
  ),
  schedule_cron = coalesce(nullif(btrim(task.schedule_cron), ''), '15 9,19 * * *'),
  timezone = coalesce(nullif(btrim(task.timezone), ''), 'America/Sao_Paulo'),
  next_run_at = coalesce(task.next_run_at, now()),
  updated_at = now()
from defaults
where task.task_type = 'opportunity_research';
