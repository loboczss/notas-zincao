import { createAdminClient } from '../../stock-integrin/sync/repository'
import { chunk } from '../../stock-integrin/sync/utils'
import type { ProdutoValorBaseRow, ProdutoVendaDiaRow, VendaVendedorDiaRow } from './aggregator'
import { INSERT_CHUNK_SIZE } from './constants'
import type {
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

// Um run 'running' cujo processo morreu (deploy/restart/excecao) fica preso e
// trava a fila, pois o guard so olha o status. Se o ultimo heartbeat (ou o
// started_at, na falta dele) for mais velho que este limite, tratamos como morto
// e liberamos a fila. Um sync saudavel bate progresso a cada pagina.
const STALE_RUN_MS = 15 * 60 * 1000

const runLastHeartbeatMs = (row: Record<string, unknown>) => {
  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>
  const progress = (metadata.progress && typeof metadata.progress === 'object'
    ? metadata.progress
    : {}) as Record<string, unknown>
  const beat = (progress.updated_at as string | undefined) || (row.started_at as string | undefined)
  if (!beat) return null
  const ms = Date.parse(String(beat).replace(' ', 'T'))
  return Number.isFinite(ms) ? ms : null
}

export const getRunningSyncRun = async (client: AdminClient, runId?: string | null) => {
  let request = (client as any)
    .from(RUNS_TABLE)
    .select('id, metadata, status, cancel_requested, cancel_requested_at, notas_total, itens_total, upserted_rows, deactivated_rows, started_at')
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
  const row = rows[0] || null
  if (!row) return null

  const lastBeat = runLastHeartbeatMs(row)
  if (lastBeat !== null && Date.now() - lastBeat > STALE_RUN_MS) {
    await (client as any)
      .from(RUNS_TABLE)
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: 'Run sem progresso por muito tempo; reivindicado automaticamente para liberar a fila.',
      })
      .eq('id', row.id)
      .eq('status', 'running')
    console.warn(`[integrim-notas] run travado ${row.id} reivindicado (sem heartbeat > ${STALE_RUN_MS / 60000}min).`)
    return null
  }

  return row
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

export const rebuildVendaVendedorDia = async (
  client: AdminClient,
  rows: VendaVendedorDiaRow[],
  runId: string,
  beforeChunk?: () => Promise<void>,
) => {
  const nowIso = new Date().toISOString()

  const { error: deleteError } = await (client as any)
    .from('integrim_venda_vendedor_dia')
    .delete()
    .not('id', 'is', null)
  if (deleteError) {
    console.error('[integrim-notas] clear venda vendedor dia failed:', deleteError.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel limpar vendas por vendedor.' })
  }

  for (const rowsChunk of chunk(rows, INSERT_CHUNK_SIZE)) {
    await beforeChunk?.()
    const payload = rowsChunk.map(row => ({
      ...row,
      sync_run_id: runId,
      updated_at: nowIso,
    }))
    const { error } = await (client as any).from('integrim_venda_vendedor_dia').insert(payload)
    if (error) {
      console.error('[integrim-notas] insert venda vendedor dia failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel gravar vendas por vendedor.' })
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
