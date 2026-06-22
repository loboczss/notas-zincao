import { randomUUID } from 'node:crypto'
import type { IntegrimNotasSyncResponse } from '../../../../shared/types/IntegrimNotas'
import type { IntegrimPagedResponse, IntegrimRecord } from '../../stock-integrin/sync/types'
import { IntegrimHttpError } from '../../stock-integrin/sync/types'
import { normalizeSyncErrorMessage, toInteger, yieldToEventLoop } from '../../stock-integrin/sync/utils'
import { ProdutoValorAggregator } from './aggregator'
import {
  createTokenManager,
  fetchItensByDatePage,
  getItensTotalPages,
} from './client'
import { getIntegrimNotasConfig } from './config'
import { DEFAULT_WINDOW_MONTHS } from './constants'
import {
  createAdminClient,
  finalizeProdutoValor,
  finishSyncRun,
  isSyncCancelRequested,
  rebuildProdutoValorBase,
  rebuildProdutoVendaDia,
  startSyncRun,
  updateSyncProgress,
} from './repository'
import type {
  IntegrimNotasSyncCounters,
  IntegrimNotasSyncOptions,
} from './types'
import { buildProgress, getWindowRange } from './utils'

type ItemPlan = {
  idempresa: number
  firstPage: IntegrimPagedResponse<IntegrimRecord>
  totalPages: number
}

class IntegrimVendaDiaBackfillCancelled extends Error {
  constructor() {
    super('Recalculo de vendas por periodo cancelado pelo usuario.')
    this.name = 'IntegrimVendaDiaBackfillCancelled'
  }
}

const emptyCounters = (): IntegrimNotasSyncCounters => ({
  notasTotal: 0,
  itensTotal: 0,
  upsertedRows: 0,
  deactivatedRows: 0,
})

export const runIntegrimVendaDiaBackfill = async (
  options: IntegrimNotasSyncOptions = {},
): Promise<IntegrimNotasSyncResponse> => {
  const config = getIntegrimNotasConfig()
  const companyIds = options.companyIds?.length ? [...new Set(options.companyIds)] : config.companyIds
  const windowMonths = Math.max(1, toInteger(options.windowMonths) || DEFAULT_WINDOW_MONTHS)
  const { startDate, endDate } = getWindowRange(windowMonths)
  const dryRun = Boolean(options.dryRun)
  const triggeredBy = String(options.triggeredBy || (dryRun ? 'dry-run' : 'manual')).slice(0, 80)
  const adminClient = dryRun ? null : createAdminClient()

  const metadata = {
    job_type: 'integrim_produto_venda_dia_backfill',
    company_ids: companyIds,
    window_months: windowMonths,
    analysis_start: startDate,
    end_date: endDate,
    cancel_requested: false,
  }

  const runId = dryRun ? randomUUID() : await startSyncRun(adminClient!, triggeredBy, metadata)
  await options.onStarted?.(runId)

  const counters = emptyCounters()
  let totalPages = 1
  let processedPages = 0

  const assertNotCancelled = async () => {
    if (dryRun || !adminClient) return
    if (await isSyncCancelRequested(adminClient, runId)) throw new IntegrimVendaDiaBackfillCancelled()
  }

  const pushProgress = async (input: Parameters<typeof buildProgress>[0]) => {
    if (dryRun || !adminClient) return
    await updateSyncProgress(adminClient!, runId, metadata, buildProgress(input), counters)
  }

  const progressInput = (
    phase: Parameters<typeof buildProgress>[0]['phase'],
    message: string,
    extra: Partial<Parameters<typeof buildProgress>[0]> = {},
  ) => ({
    phase,
    totalPages,
    processedPages,
    notasTotal: counters.notasTotal,
    itensTotal: counters.itensTotal,
    upsertedRows: counters.upsertedRows,
    deactivatedRows: counters.deactivatedRows,
    message,
    ...extra,
  })

  try {
    await assertNotCancelled()
    const tokens = await createTokenManager(config)
    await assertNotCancelled()

    const itemPlans: ItemPlan[] = []
    for (const idempresa of companyIds) {
      await assertNotCancelled()
      const firstPage = await fetchItensByDatePage(config, tokens, idempresa, startDate, endDate, 1)
      itemPlans.push({ idempresa, firstPage, totalPages: getItensTotalPages(firstPage) })
      await yieldToEventLoop()
    }

    totalPages = Math.max(itemPlans.reduce((total, plan) => total + plan.totalPages, 0), 1)
    await pushProgress(progressInput('starting', `Recalculando vendas diarias desde ${startDate}.`))

    const aggregator = new ProdutoValorAggregator()
    for (const plan of itemPlans) {
      for (let page = 1; page <= plan.totalPages; page += 1) {
        await assertNotCancelled()
        const itemsResult = page === 1
          ? plan.firstPage
          : await fetchItensByDatePage(config, tokens, plan.idempresa, startDate, endDate, page)
        if (!itemsResult.data.length) break

        for (const record of itemsResult.data) aggregator.add(record)
        counters.itensTotal += itemsResult.data.length
        processedPages += 1

        await pushProgress(progressInput('reading', `Vendas empresa ${plan.idempresa}: ${counters.itensTotal} itens lidos.`, {
          currentCompany: plan.idempresa,
          currentPage: page,
        }))
        await yieldToEventLoop()
      }
    }

    const baseRows = aggregator.toRows()
    const dailyRows = aggregator.toDailyRows()
    counters.upsertedRows = baseRows.length + dailyRows.length

    if (!dryRun) {
      await pushProgress(progressInput('upserting', `Gravando analise de ${baseRows.length} produtos.`))
      await rebuildProdutoValorBase(adminClient!, baseRows, assertNotCancelled)

      await pushProgress(progressInput('upserting', `Gravando ${dailyRows.length} agregados produto/dia.`))
      await rebuildProdutoVendaDia(adminClient!, dailyRows, runId, assertNotCancelled)

      await pushProgress(progressInput('aggregating', 'Cruzando vendas com estoque e recalculando score.'))
      await finalizeProdutoValor(adminClient!)

      const doneProgress = buildProgress(progressInput('done', 'Vendas por periodo recalculadas.'))
      await finishSyncRun(adminClient!, runId, 'success', {
        notas_total: counters.notasTotal,
        itens_total: counters.itensTotal,
        upserted_rows: counters.upsertedRows,
        deactivated_rows: counters.deactivatedRows,
        error_message: null,
        metadata: { ...metadata, progress: doneProgress },
      })
    }

    return {
      success: true,
      dry_run: dryRun,
      run_id: runId,
      notas_total: counters.notasTotal,
      itens_total: counters.itensTotal,
      upserted_rows: counters.upsertedRows,
      deactivated_rows: counters.deactivatedRows,
      companies: companyIds,
    }
  }
  catch (error) {
    if (error instanceof IntegrimVendaDiaBackfillCancelled) {
      const now = new Date().toISOString()
      const cancelledProgress = buildProgress(progressInput('cancelled', 'Recalculo de vendas por periodo cancelado.'))
      if (!dryRun && adminClient) {
        await finishSyncRun(adminClient, runId, 'cancelled', {
          notas_total: counters.notasTotal,
          itens_total: counters.itensTotal,
          upserted_rows: counters.upsertedRows,
          deactivated_rows: counters.deactivatedRows,
          error_message: null,
          cancel_requested: true,
          cancel_requested_at: now,
          metadata: { ...metadata, cancel_requested: true, cancel_requested_at: now, progress: cancelledProgress },
        })
      }

      return {
        success: true,
        dry_run: dryRun,
        run_id: runId,
        cancelled: true,
        notas_total: counters.notasTotal,
        itens_total: counters.itensTotal,
        upserted_rows: counters.upsertedRows,
        deactivated_rows: counters.deactivatedRows,
        companies: companyIds,
      }
    }

    const message = normalizeSyncErrorMessage(error)
    const failedProgress = buildProgress(progressInput('failed', message))
    if (!dryRun && adminClient) {
      await finishSyncRun(adminClient, runId, 'failed', {
        error_message: message,
        metadata: { ...metadata, progress: failedProgress },
      })
    }

    if (error instanceof IntegrimHttpError) {
      throw createError({ statusCode: 502, statusMessage: message })
    }
    throw error
  }
}
