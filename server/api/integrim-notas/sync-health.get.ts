import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import type { IntegrimSyncHealth, IntegrimSyncHealthResponse } from '../../../shared/types/IntegrimNotas'

const numberOrNull = (value: unknown) => (value === null || value === undefined ? null : Number(value))

export default defineEventHandler(async (event): Promise<IntegrimSyncHealthResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await (client as any).rpc('integrim_sync_health')

  if (error) {
    console.error('[api/integrim-notas/sync-health] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel consultar a saude do sync.' })
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
  const health: IntegrimSyncHealth = {
    last_success_at: row?.last_success_at ? String(row.last_success_at) : null,
    last_finished_at: row?.last_finished_at ? String(row.last_finished_at) : null,
    last_status: row?.last_status ? String(row.last_status) : null,
    last_error: row?.last_error ? String(row.last_error) : null,
    last_triggered_by: row?.last_triggered_by ? String(row.last_triggered_by) : null,
    running: Boolean(row?.running),
    daily_rows: Number(row?.daily_rows || 0),
    daily_min_date: row?.daily_min_date ? String(row.daily_min_date) : null,
    daily_max_date: row?.daily_max_date ? String(row.daily_max_date) : null,
    daily_stale_days: numberOrNull(row?.daily_stale_days),
    produtos: Number(row?.produtos || 0),
    base_updated_at: row?.base_updated_at ? String(row.base_updated_at) : null,
  }

  return { success: true, health }
})
