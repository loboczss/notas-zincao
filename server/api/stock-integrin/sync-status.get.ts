import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import type {
  StockIntegrinSyncProgress,
  StockIntegrinSyncRun,
  StockIntegrinSyncStatusResponse,
} from '../../../shared/types/StockIntegrin'

const isProgressPhase = (value: unknown): value is StockIntegrinSyncProgress['phase'] => {
  return ['starting', 'reading', 'upserting', 'deactivating', 'cancelling', 'cancelled', 'done', 'failed'].includes(String(value))
}

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseProgress = (metadata: Record<string, unknown>): StockIntegrinSyncProgress | null => {
  const progress = metadata.progress
  if (!progress || typeof progress !== 'object') return null

  const record = progress as Record<string, unknown>
  const phase = isProgressPhase(record.phase) ? record.phase : null
  if (!phase) return null

  return {
    phase,
    total_pages: numberValue(record.total_pages),
    processed_pages: numberValue(record.processed_pages),
    total_saldos_estimated: numberValue(record.total_saldos_estimated),
    processed_saldos: numberValue(record.processed_saldos),
    upserted_rows: numberValue(record.upserted_rows),
    deactivated_rows: numberValue(record.deactivated_rows),
    current_company: record.current_company === null || record.current_company === undefined ? null : numberValue(record.current_company),
    current_page: record.current_page === null || record.current_page === undefined ? null : numberValue(record.current_page),
    progress_percent: numberValue(record.progress_percent),
    message: String(record.message || ''),
    updated_at: String(record.updated_at || ''),
  }
}

const toSyncRun = (row: Record<string, unknown>): StockIntegrinSyncRun => {
  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>

  return {
    id: String(row.id),
    status: String(row.status || 'failed') as StockIntegrinSyncRun['status'],
    triggered_by: String(row.triggered_by || ''),
    started_at: String(row.started_at || ''),
    finished_at: row.finished_at ? String(row.finished_at) : null,
    cancel_requested: row.cancel_requested === true,
    cancel_requested_at: row.cancel_requested_at ? String(row.cancel_requested_at) : null,
    cad_produtos_total: Number(row.cad_produtos_total || 0),
    precos_total: Number(row.precos_total || 0),
    saldos_total: Number(row.saldos_total || 0),
    upserted_rows: Number(row.upserted_rows || 0),
    deactivated_rows: Number(row.deactivated_rows || 0),
    error_message: row.error_message ? String(row.error_message) : null,
    metadata,
    progress: parseProgress(metadata),
  }
}

export default defineEventHandler(async (event): Promise<StockIntegrinSyncStatusResponse> => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await (client as any)
    .from('stock_integrin_sync_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(8)

  if (error) {
    console.error('[api/stock-integrin/sync-status] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel consultar a sincronizacao do Stock Integrin.',
    })
  }

  const runs = ((data || []) as Array<Record<string, unknown>>).map(toSyncRun)

  return {
    success: true,
    latest: runs[0] || null,
    runs,
  }
})
