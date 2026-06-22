-- Defaults adicionais para localidade e selecao de produtos das tasks IA.

alter table public.ai_compra_tasks
  alter column params set default jsonb_build_object(
    'region', 'Brasil',
    'city', '',
    'state', '',
    'model', 'gpt-5.4-mini',
    'min_confidence', 0.62,
    'max_opportunities', 20,
    'sources', jsonb_build_array('clima', 'cidade', 'esporte', 'feriado', 'obra', 'tendencia', 'fornecedor'),
    'product_selection', jsonb_build_object(
      'mode', 'top_score',
      'limit', 50,
      'specific_products', '[]'::jsonb
    ),
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

with defaults as (
  select
    jsonb_build_object(
      'region', 'Brasil',
      'city', '',
      'state', '',
      'model', 'gpt-5.4-mini',
      'min_confidence', 0.62,
      'max_opportunities', 20,
      'sources', jsonb_build_array('clima', 'cidade', 'esporte', 'feriado', 'obra', 'tendencia', 'fornecedor')
    ) as base_params,
    jsonb_build_object(
      'mode', 'top_score',
      'limit', 50,
      'specific_products', '[]'::jsonb
    ) as product_selection_params
)
update public.ai_compra_tasks task
set
  params = jsonb_set(
    defaults.base_params || coalesce(task.params, '{}'::jsonb),
    '{product_selection}',
    defaults.product_selection_params || coalesce(task.params -> 'product_selection', '{}'::jsonb),
    true
  ),
  updated_at = now()
from defaults
where task.task_type = 'opportunity_research';
