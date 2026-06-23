import { serverSupabaseUser } from '#supabase/server'
import { createAdminClient } from '../../../services/integrim-notas/sync/repository'
import { loadSyncSchedule } from '../../../services/integrim-notas/sync-schedule'
import type { IntegrimSyncScheduleResponse } from '../../../../shared/types/IntegrimNotas'

export default defineEventHandler(async (event): Promise<IntegrimSyncScheduleResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = createAdminClient()
  const schedule = await loadSyncSchedule(client)
  return { success: true, schedule }
})
