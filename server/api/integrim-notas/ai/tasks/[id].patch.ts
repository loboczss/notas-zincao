import type {
  IntegrimCompraAiTaskResponse,
  IntegrimCompraAiTaskUpsertRequest,
} from '../../../../../shared/types/IntegrimNotas'
import {
  mapCompraAiTask,
  sanitizeCompraTaskPayload,
} from '../../../../services/integrim-notas/ai/opportunity-task-config'
import { getNextCompraTaskRunAt } from '../../../../services/integrim-notas/ai/opportunity-task-schedule'
import { createAdminClient } from '../../../../services/integrim-notas/sync/repository'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../../../utils/stock-integrin-auth'

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

const objectValue = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export default defineEventHandler(async (event): Promise<IntegrimCompraAiTaskResponse> => {
  await authorizeStockIntegrinAdminOrServiceRole(event, {
    key: 'integrim-notas:oportunidades-ia:update-task',
    adminLimit: 40,
    serviceRoleLimit: 60,
    windowMs: 60 * 60 * 1000,
  })

  const id = String(getRouterParam(event, 'id') || '').trim()
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Task IA invalida.' })

  const body = await readBody<IntegrimCompraAiTaskUpsertRequest>(event)
    .catch(() => ({} as IntegrimCompraAiTaskUpsertRequest))
  const client = createAdminClient()

  const { data: current, error: currentError } = await (client as any)
    .from('ai_compra_tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (currentError) {
    console.error('[integrim-notas:oportunidades-ia] read task failed:', currentError.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel carregar a task de IA.' })
  }

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Task IA nao encontrada.' })
  }

  const currentRow = current as Record<string, unknown>
  const values = sanitizeCompraTaskPayload({
    name: body.name ?? String(currentRow.name || ''),
    enabled: body.enabled ?? currentRow.enabled !== false,
    schedule_cron: body.schedule_cron ?? String(currentRow.schedule_cron || ''),
    timezone: body.timezone ?? String(currentRow.timezone || ''),
    params: {
      ...objectValue(currentRow.params),
      ...objectValue(body.params),
    },
  }, objectValue(currentRow.params))

  const { data, error } = await (client as any)
    .from('ai_compra_tasks')
    .update({
      ...values,
      next_run_at: getNextCompraTaskRunAt(values.params, values.timezone),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('[integrim-notas:oportunidades-ia] update task failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel atualizar a task de IA.' })
  }

  return {
    success: true,
    task: mapCompraAiTask(data as Record<string, unknown>),
  }
})
