import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdminConfigOrThrow } from '../../../utils/admin-users'
import {
  STALE_CHUNK_SIZE,
  UPSERT_CHUNK_SIZE,
} from './constants'
import type {
  StockIntegrinSyncCounters,
  StockIntegrinSyncProgress,
  StockIntegrinUpsertRow,
} from './types'
import { chunk } from './utils'

export const createAdminClient = () => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminConfigOrThrow()
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

type AdminClient = ReturnType<typeof createAdminClient>

export const startSyncRun = async (
  client: AdminClient,
  triggeredBy: string,
  metadata: Record<string, unknown>,
) => {
  const { data, error } = await (client as any)
    .from('stock_integrin_sync_runs')
    .insert({
      status: 'running',
      triggered_by: triggeredBy,
      metadata,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[stock-integrin] failed to create sync run:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel iniciar o registro de sincronizacao.',
    })
  }

  return String(data.id)
}

export const updateSyncProgress = async (
  client: AdminClient,
  runId: string,
  metadata: Record<string, unknown>,
  progress: StockIntegrinSyncProgress,
  counters: StockIntegrinSyncCounters,
) => {
  const { error } = await (client as any)
    .from('stock_integrin_sync_runs')
    .update({
      metadata: {
        ...metadata,
        progress,
      },
      cad_produtos_total: counters.cadProdutosTotal,
      precos_total: counters.precosTotal,
      saldos_total: counters.saldosTotal,
      upserted_rows: counters.upsertedRows,
      deactivated_rows: counters.deactivatedRows,
    })
    .eq('id', runId)
    .eq('status', 'running')

  if (error) {
    console.error('[stock-integrin] failed to update sync progress:', error.message)
  }
}

export const finishSyncRun = async (
  client: AdminClient,
  runId: string,
  status: 'success' | 'failed' | 'cancelled',
  values: Partial<{
    cad_produtos_total: number
    precos_total: number
    saldos_total: number
    upserted_rows: number
    deactivated_rows: number
    error_message: string | null
    cancel_requested: boolean
    cancel_requested_at: string | null
    metadata: Record<string, unknown>
  }>,
) => {
  let request = (client as any)
    .from('stock_integrin_sync_runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      ...values,
    })
    .eq('id', runId)

  request = status === 'cancelled'
    ? request.in('status', ['running', 'cancelled'])
    : request.eq('status', 'running')

  const { error } = await request

  if (error) {
    console.error('[stock-integrin] failed to finish sync run:', error.message)
  }
}

export const refreshStockIntegrinSummary = async (client: AdminClient) => {
  const { error } = await (client as any).rpc('refresh_stock_integrin_summary')

  if (error) {
    console.error('[stock-integrin] failed to refresh summary:', error.message)
  }
}

export const getRunningSyncRun = async (client: AdminClient, runId?: string | null) => {
  let request = (client as any)
    .from('stock_integrin_sync_runs')
    .select('id, metadata, status, cancel_requested, cancel_requested_at, cad_produtos_total, precos_total, saldos_total, upserted_rows, deactivated_rows')
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)

  if (runId) {
    request = request.eq('id', runId)
  }

  const { data, error } = await request

  if (error) {
    console.error('[stock-integrin] failed to read running sync run:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel consultar a sincronizacao em andamento.',
    })
  }

  const rows = (data || []) as Array<Record<string, unknown>>
  return rows[0] || null
}

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const requestSyncCancel = async (client: AdminClient, runId?: string | null) => {
  const runningRun = await getRunningSyncRun(client, runId)

  if (!runningRun) {
    return {
      runId: runId || null,
      cancelRequested: false,
    }
  }

  const now = new Date().toISOString()
  const cancelRequestedAt = runningRun.cancel_requested_at ? String(runningRun.cancel_requested_at) : now
  const metadata = (runningRun.metadata && typeof runningRun.metadata === 'object'
    ? runningRun.metadata
    : {}) as Record<string, unknown>
  const progress = metadata.progress && typeof metadata.progress === 'object'
    ? {
        ...(metadata.progress as Record<string, unknown>),
        phase: 'cancelled',
        message: 'Sincronizacao interrompida manualmente.',
        updated_at: now,
      }
    : {
        phase: 'cancelled',
        total_pages: 1,
        processed_pages: 0,
        total_saldos_estimated: numberValue(runningRun.saldos_total),
        processed_saldos: numberValue(runningRun.saldos_total),
        upserted_rows: numberValue(runningRun.upserted_rows),
        deactivated_rows: numberValue(runningRun.deactivated_rows),
        current_company: null,
        current_page: null,
        progress_percent: 0,
        message: 'Sincronizacao interrompida manualmente.',
        updated_at: now,
      }

  const { error } = await (client as any)
    .from('stock_integrin_sync_runs')
    .update({
      status: 'cancelled',
      finished_at: now,
      cancel_requested: true,
      cancel_requested_at: cancelRequestedAt,
      error_message: null,
      metadata: {
        ...metadata,
        cancel_requested: true,
        cancel_requested_at: cancelRequestedAt,
        progress,
      },
    })
    .eq('id', runningRun.id)
    .eq('status', 'running')

  if (error) {
    console.error('[stock-integrin] failed to request sync cancel:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel solicitar parada da sincronizacao.',
    })
  }

  return {
    runId: String(runningRun.id),
    cancelRequested: true,
    cancelled: true,
  }
}

export const isSyncCancelRequested = async (client: AdminClient, runId: string) => {
  const { data, error } = await (client as any)
    .from('stock_integrin_sync_runs')
    .select('status, cancel_requested')
    .eq('id', runId)
    .maybeSingle()

  if (error) {
    console.error('[stock-integrin] failed to check sync cancel:', error.message)
    return false
  }

  const row = data as { status?: string | null, cancel_requested?: boolean | null } | null
  if (!row) return false

  return row.status !== 'running' || row.cancel_requested === true
}

export const upsertRows = async (
  client: AdminClient,
  rows: StockIntegrinUpsertRow[],
  beforeChunk?: () => Promise<void>,
) => {
  let upsertedRows = 0

  for (const rowsChunk of chunk(rows, UPSERT_CHUNK_SIZE)) {
    await beforeChunk?.()

    const { error } = await (client as any)
      .from('stock_integrin')
      .upsert(rowsChunk, {
        onConflict: 'idempresa,idproduto,idsubproduto',
      })

    if (error) {
      console.error('[stock-integrin] upsert failed:', error.message)
      throw createError({
        statusCode: 500,
        statusMessage: 'Nao foi possivel salvar o estoque Integrim no Supabase.',
      })
    }

    upsertedRows += rowsChunk.length
    await beforeChunk?.()
  }

  return upsertedRows
}

const fetchStaleIds = async (
  client: AdminClient,
  idempresa: number,
  runId: string,
  mode: 'null' | 'different',
) => {
  let request = (client as any)
    .from('stock_integrin')
    .select('id')
    .eq('idempresa', idempresa)
    .eq('is_present', true)
    .limit(STALE_CHUNK_SIZE)

  request = mode === 'null'
    ? request.is('sync_run_id', null)
    : request.neq('sync_run_id', runId)

  const { data, error } = await request

  if (error) {
    console.error('[stock-integrin] fetch stale rows failed:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel localizar linhas antigas do estoque Integrim.',
    })
  }

  return ((data || []) as Array<{ id?: string }>)
    .map(row => row.id)
    .filter((id): id is string => Boolean(id))
}

const deactivateIds = async (client: AdminClient, ids: string[]) => {
  if (!ids.length) return 0

  const { error } = await (client as any)
    .from('stock_integrin')
    .update({
      is_present: false,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) {
    console.error('[stock-integrin] deactivate stale rows failed:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel desativar linhas antigas do estoque Integrim.',
    })
  }

  return ids.length
}

export const deactivateStaleRows = async (
  client: AdminClient,
  companyIds: number[],
  runId: string,
  onProgress?: (deactivatedRows: number) => Promise<void>,
  beforeChunk?: () => Promise<void>,
) => {
  let deactivatedRows = 0

  for (const idempresa of companyIds) {
    for (const mode of ['null', 'different'] as const) {
      while (true) {
        await beforeChunk?.()
        const ids = await fetchStaleIds(client, idempresa, runId, mode)
        if (!ids.length) break

        deactivatedRows += await deactivateIds(client, ids)
        await beforeChunk?.()
        await onProgress?.(deactivatedRows)
      }
    }
  }

  return deactivatedRows
}
