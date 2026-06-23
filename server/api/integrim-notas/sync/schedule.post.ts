import { createAdminClient } from '../../../services/integrim-notas/sync/repository'
import {
  SYNC_SCHEDULE_TABLE,
  buildSyncSchedule,
  sanitizeScheduleUpdate,
} from '../../../services/integrim-notas/sync-schedule'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../../utils/stock-integrin-auth'
import type {
  IntegrimSyncScheduleResponse,
  IntegrimSyncScheduleUpdateRequest,
} from '../../../../shared/types/IntegrimNotas'

export default defineEventHandler(async (event): Promise<IntegrimSyncScheduleResponse> => {
  const { triggeredBy } = await authorizeStockIntegrinAdminOrServiceRole(event, {
    key: 'integrim-notas:sync-schedule',
    adminLimit: 30,
    serviceRoleLimit: 60,
    windowMs: 60 * 60 * 1000,
  })

  const body = await readBody<IntegrimSyncScheduleUpdateRequest>(event).catch(() => ({} as IntegrimSyncScheduleUpdateRequest))
  const values = sanitizeScheduleUpdate(body)
  const client = createAdminClient()

  const { data, error } = await (client as any)
    .from(SYNC_SCHEDULE_TABLE)
    .upsert({
      id: true,
      ...values,
      updated_at: new Date().toISOString(),
      updated_by: triggeredBy,
    }, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    console.error('[integrim-notas:sync-schedule] update failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel salvar o agendamento.' })
  }

  return { success: true, schedule: buildSyncSchedule(data as Record<string, unknown>) }
})
