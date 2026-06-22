import type { IntegrimCompraTaskRunResponse } from '../../../../shared/types/IntegrimNotas'
import { runCompraOpportunityTask } from '../../../services/integrim-notas/opportunities'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../../utils/stock-integrin-auth'

export default defineEventHandler(async (event): Promise<IntegrimCompraTaskRunResponse> => {
  await authorizeStockIntegrinAdminOrServiceRole(event, {
    key: 'integrim-notas:oportunidades-ia:run-task',
    adminLimit: 4,
    serviceRoleLimit: 12,
    windowMs: 60 * 60 * 1000,
  })

  const body: { task_id?: string | null } = await readBody<{ task_id?: string | null }>(event).catch(() => ({}))
  const taskId = body?.task_id ? String(body.task_id) : null
  return runCompraOpportunityTask(event, { taskId })
})
