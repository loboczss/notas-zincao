import { createAdminClient } from '../../stock-integrin/sync/repository'
import { chunk } from '../../stock-integrin/sync/utils'
import type { ProdutoValorBaseRow, ProdutoVendaDiaRow } from './aggregator'
import { INSERT_CHUNK_SIZE, STALE_CHUNK_SIZE, UPSERT_CHUNK_SIZE } from './constants'
import type {
  IntegrimNotaUpsertRow,
  IntegrimNotasSyncCounters,
  IntegrimNotasSyncProgress,
} from './types'

export { createAdminClient }

type AdminClient = ReturnType<typeof createAdminClient>

const RUNS_TABLE = 'integrim_notas_sync_runs'

export const startSyncRun = async (
  client: AdminClient,
  triggeredBy: string,
  metadata: Record<string, unknown>,
) => {
  const { data, error } = await (client as any)
    .from(RUNS_TABLE)
    .insert({ status: 'running', triggered_by: triggeredBy, metadata })
    .select('id')
    .single()

  if (error) {
    console.error('[integrim-notas] failed to create sync run:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel iniciar o registro de sincronizacao.' })
  }

  return String(data.id)
}

export const updateSyncProgress = async (
  client: AdminClient,
  runId: string,
  metadata: Record<string, unknown>,
  progress: IntegrimNotasSyncProgress,
  counters: IntegrimNotasSyncCounters,
) => {
  const { error } = await (client as any)
    .from(RUNS_TABLE)
    .update({
      metadata: { ...metadata, progress },
      notas_total: counters.notasTotal,
      itens_total: counters.itensTotal,
      upserted_rows: counters.upsertedRows,
      deactivated_rows: counters.deactivatedRows,
    })
    .eq('id', runId)
    .eq('status', 'running')

  if (error) console.error('[integrim-notas] failed to update sync progress:', error.message)
}

export const finishSyncRun = async (
  client: AdminClient,
  runId: string,
  status: 'success' | 'failed' | 'cancelled',
  values: Partial<{
    notas_total: number
    itens_total: number
    upserted_rows: number
    deactivated_rows: number
    error_message: string | null
    cancel_requested: boolean
    cancel_requested_at: string | null
    metadata: Record<string, unknown>
  }>,
) => {
  let request = (client as any)
    .from(RUNS_TABLE)
    .update({ status, finished_at: new Date().toISOString(), ...values })
    .eq('id', runId)

  request = status === 'cancelled'
    ? request.in('status', ['running', 'cancelled'])
    : request.eq('status', 'running')

  const { error } = await request
  if (error) console.error('[integrim-notas] failed to finish sync run:', error.message)
}

export const getRunningSyncRun = async (client: AdminClient, runId?: string | null) => {
  let request = (client as any)
    .from(RUNS_TABLE)
    .select('id, metadata, status, cancel_requested, cancel_requested_at, notas_total, itens_total, upserted_rows, deactivated_rows')
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)

  if (runId) request = request.eq('id', runId)

  const { data, error } = await request
  if (error) {
    console.error('[integrim-notas] failed to read running sync run:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel consultar a sincronizacao em andamento.' })
  }

  const rows = (data || []) as Array<Record<string, unknown>>
  return rows[0] || null
}

export const isSyncCancelRequested = async (client: AdminClient, runId: string) => {
  const { data, error } = await (client as any)
    .from(RUNS_TABLE)
    .select('status, cancel_requested')
    .eq('id', runId)
    .maybeSingle()

  if (error) {
    console.error('[integrim-notas] failed to check sync cancel:', error.message)
    return false
  }

  const row = data as { status?: string | null, cancel_requested?: boolean | null } | null
  if (!row) return false
  return row.status !== 'running' || row.cancel_requested === true
}

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const requestSyncCancel = async (client: AdminClient, runId?: string | null) => {
  const runningRun = await getRunningSyncRun(client, runId)
  if (!runningRun) return { runId: runId || null, cancelRequested: false }

  const now = new Date().toISOString()
  const cancelRequestedAt = runningRun.cancel_requested_at ? String(runningRun.cancel_requested_at) : now
  const metadata = (runningRun.metadata && typeof runningRun.metadata === 'object'
    ? runningRun.metadata
    : {}) as Record<string, unknown>
  const progress = metadata.progress && typeof metadata.progress === 'object'
    ? { ...(metadata.progress as Record<string, unknown>), phase: 'cancelled', message: 'Sincronizacao interrompida manualmente.', updated_at: now }
    : {
        phase: 'cancelled',
        total_pages: 1,
        processed_pages: 0,
        notas_total: numberValue(runningRun.notas_total),
        itens_total: numberValue(runningRun.itens_total),
        upserted_rows: numberValue(runningRun.upserted_rows),
        deactivated_rows: numberValue(runningRun.deactivated_rows),
        current_company: null,
        current_modelo: null,
        current_page: null,
        progress_percent: 0,
        message: 'Sincronizacao interrompida manualmente.',
        updated_at: now,
      }

  const { error } = await (client as any)
    .from(RUNS_TABLE)
    .update({
      status: 'cancelled',
      finished_at: now,
      cancel_requested: true,
      cancel_requested_at: cancelRequestedAt,
      error_message: null,
      metadata: { ...metadata, cancel_requested: true, cancel_requested_at: cancelRequestedAt, progress },
    })
    .eq('id', runningRun.id)
    .eq('status', 'running')

  if (error) {
    console.error('[integrim-notas] failed to request sync cancel:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel solicitar parada da sincronizacao.' })
  }

  return { runId: String(runningRun.id), cancelRequested: true, cancelled: true }
}

export const upsertNotas = async (
  client: AdminClient,
  rows: IntegrimNotaUpsertRow[],
  beforeChunk?: () => Promise<void>,
) => {
  let upserted = 0
  for (const rowsChunk of chunk(rows, UPSERT_CHUNK_SIZE)) {
    await beforeChunk?.()
    const { error } = await (client as any)
      .from('integrim_notas')
      .upsert(rowsChunk, { onConflict: 'idempresa,idplanilha' })
    if (error) {
      console.error('[integrim-notas] upsert notas failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel salvar as notas do Integrim.' })
    }
    upserted += rowsChunk.length
    await beforeChunk?.()
  }
  return upserted
}

// Desativa, dentro da janela, cabecalhos que este run nao tocou (notas removidas).
export const deactivateStaleRows = async (
  client: AdminClient,
  startDate: string,
  runId: string,
  beforeChunk?: () => Promise<void>,
) => {
  let deactivated = 0

  while (true) {
    await beforeChunk?.()
    const { data, error } = await (client as any)
      .from('integrim_notas')
      .select('id')
      .eq('is_present', true)
      .gte('dtmovimento', startDate)
      .neq('sync_run_id', runId)
      .limit(STALE_CHUNK_SIZE)

    if (error) {
      console.error('[integrim-notas] fetch stale notas failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel localizar notas antigas do Integrim.' })
    }

    const ids = ((data || []) as Array<{ id?: string }>).map(row => row.id).filter((id): id is string => Boolean(id))
    if (!ids.length) break

    const { error: updateError } = await (client as any)
      .from('integrim_notas')
      .update({ is_present: false, updated_at: new Date().toISOString() })
      .in('id', ids)

    if (updateError) {
      console.error('[integrim-notas] deactivate notas failed:', updateError.message)
      throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel desativar notas antigas do Integrim.' })
    }

    deactivated += ids.length
    await beforeChunk?.()
  }

  return deactivated
}

// Reconstroi a tabela derivada de valor a partir das vendas agregadas em memoria.
export const rebuildProdutoValorBase = async (
  client: AdminClient,
  rows: ProdutoValorBaseRow[],
  beforeChunk?: () => Promise<void>,
) => {
  const nowIso = new Date().toISOString()

  const { error: deleteError } = await (client as any)
    .from('integrim_produto_valor')
    .delete()
    .not('id', 'is', null)
  if (deleteError) {
    console.error('[integrim-notas] clear produto valor failed:', deleteError.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel limpar a analise de valor.' })
  }

  for (const rowsChunk of chunk(rows, INSERT_CHUNK_SIZE)) {
    await beforeChunk?.()
    const payload = rowsChunk.map(row => ({ ...row, updated_at: nowIso }))
    const { error } = await (client as any).from('integrim_produto_valor').insert(payload)
    if (error) {
      console.error('[integrim-notas] insert produto valor failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel gravar a analise de valor.' })
    }
  }
}

export const rebuildProdutoVendaDia = async (
  client: AdminClient,
  rows: ProdutoVendaDiaRow[],
  runId: string,
  beforeChunk?: () => Promise<void>,
) => {
  const nowIso = new Date().toISOString()

  const { error: deleteError } = await (client as any)
    .from('integrim_produto_venda_dia')
    .delete()
    .not('id', 'is', null)
  if (deleteError) {
    console.error('[integrim-notas] clear produto venda dia failed:', deleteError.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel limpar vendas por periodo.' })
  }

  for (const rowsChunk of chunk(rows, INSERT_CHUNK_SIZE)) {
    await beforeChunk?.()
    const payload = rowsChunk.map(row => ({
      ...row,
      sync_run_id: runId,
      updated_at: nowIso,
    }))
    const { error } = await (client as any).from('integrim_produto_venda_dia').insert(payload)
    if (error) {
      console.error('[integrim-notas] insert produto venda dia failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel gravar vendas por periodo.' })
    }
  }
}

// Enriquece a tabela de valor com estoque/custo e calcula derivados + score.
export const finalizeProdutoValor = async (client: AdminClient) => {
  const { error } = await (client as any).rpc('finalize_integrim_produto_valor')
  if (error) {
    console.error('[integrim-notas] finalize produto valor failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel finalizar a analise de valor.' })
  }
}
