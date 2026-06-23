import type {
  IntegrimCompraAiTaskResponse,
  IntegrimCompraAiTaskUpsertRequest,
} from '../../../../shared/types/IntegrimNotas'
import {
  mapCompraAiTask,
  sanitizeCompraTaskPayload,
} from '../../../services/integrim-notas/ai/opportunity-task-config'
import { getNextCompraTaskRunAt } from '../../../services/integrim-notas/ai/opportunity-task-schedule'
import { createAdminClient } from '../../../services/integrim-notas/sync/repository'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../../utils/stock-integrin-auth'

export default defineEventHandler(async (event): Promise<IntegrimCompraAiTaskResponse> => {
  await authorizeStockIntegrinAdminOrServiceRole(event, {
    key: 'integrim-notas:oportunidades-ia:create-task',
    adminLimit: 20,
    serviceRoleLimit: 30,
    windowMs: 60 * 60 * 1000,
  })

  const body = await readBody<IntegrimCompraAiTaskUpsertRequest>(event)
    .catch(() => ({} as IntegrimCompraAiTaskUpsertRequest))
  const values = sanitizeCompraTaskPayload(body)
  const client = createAdminClient()

  const { data, error } = await (client as any)
    .from('ai_compra_tasks')
    .upsert({
      ...values,
      task_type: 'opportunity_research',
      next_run_at: getNextCompraTaskRunAt(values.params, values.timezone),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'name' })
    .select('*')
    .single()

  if (error) {
    console.error('[integrim-notas:oportunidades-ia] create task failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel salvar a task de IA.' })
  }

  return {
    success: true,
    task: mapCompraAiTask(data as Record<string, unknown>),
  }
})
