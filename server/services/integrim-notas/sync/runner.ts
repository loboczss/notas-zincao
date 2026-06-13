import { randomUUID } from 'node:crypto'
import type { IntegrimNotasSyncResponse } from '../../../../shared/types/IntegrimNotas'
import type { IntegrimPagedResponse, IntegrimRecord } from '../../stock-integrin/sync/types'
import { IntegrimHttpError } from '../../stock-integrin/sync/types'
import { normalizeSyncErrorMessage, toInteger, yieldToEventLoop } from '../../stock-integrin/sync/utils'
import { ProdutoValorAggregator } from './aggregator'
import {
  createCompanyModelPlans,
  createTokenManager,
  fetchDocumentosPage,
  fetchItensByDatePage,
  getItensTotalPages,
} from './client'
import { getIntegrimNotasConfig } from './config'
import { ANALYSIS_WINDOW_DAYS, DEFAULT_WINDOW_MONTHS, SUPPORTED_MODELOS } from './constants'
import { buildNotaRow, isNotaCancelada } from './mapper'
import {
  createAdminClient,
  deactivateStaleRows,
  finalizeProdutoValor,
  finishSyncRun,
  isSyncCancelRequested,
  rebuildProdutoValorBase,
  startSyncRun,
  updateSyncProgress,
  upsertNotas,
} from './repository'
import type {
  CompanyModelPlan,
  IntegrimNotaUpsertRow,
  IntegrimNotasSyncCounters,
  IntegrimNotasSyncOptions,
} from './types'
import { buildProgress, formatIsoDate, getWindowRange } from './utils'

type ItemPlan = {
  idempresa: number
  firstPage: IntegrimPagedResponse<IntegrimRecord>
  totalPages: number
}

class IntegrimNotasSyncCancelled extends Error {
  constructor() {
    super('Sincronizacao cancelada pelo usuario.')
    this.name = 'IntegrimNotasSyncCancelled'
  }
}

const emptyCounters = (): IntegrimNotasSyncCounters => ({
  notasTotal: 0,
  itensTotal: 0,
  upsertedRows: 0,
  deactivatedRows: 0,
})

const getAnalysisStart = (days: number) => {
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - days)
  return formatIsoDate(start)
}

export const runIntegrimNotasSync = async (
  options: IntegrimNotasSyncOptions = {},
): Promise<IntegrimNotasSyncResponse> => {
  const config = getIntegrimNotasConfig()
  const companyIds = options.companyIds?.length ? [...new Set(options.companyIds)] : config.companyIds
  const windowMonths = Math.max(1, toInteger(options.windowMonths) || DEFAULT_WINDOW_MONTHS)
  const { startDate: headerStart, endDate } = getWindowRange(windowMonths)
  const analysisStart = getAnalysisStart(ANALYSIS_WINDOW_DAYS)
  const dryRun = Boolean(options.dryRun)
  const deactivateStale = options.deactivateStale ?? !dryRun
  const triggeredBy = String(options.triggeredBy || (dryRun ? 'dry-run' : 'manual')).slice(0, 80)
  const adminClient = dryRun ? null : createAdminClient()

  const metadata = {
    company_ids: companyIds,
    modelos: SUPPORTED_MODELOS,
    window_months: windowMonths,
    header_start: headerStart,
    analysis_start: analysisStart,
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
    if (await isSyncCancelRequested(adminClient, runId)) throw new IntegrimNotasSyncCancelled()
  }

  const pushProgress = async (input: Parameters<typeof buildProgress>[0]) => {
    if (dryRun || !adminClient) return
    await updateSyncProgress(adminClient, runId, metadata, buildProgress(input), counters)
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

    // Planos: cabecalhos (por empresa+modelo) e itens (por empresa).
    const headerPlans = await createCompanyModelPlans(config, tokens, companyIds, SUPPORTED_MODELOS, headerStart, endDate)
    const itemPlans: ItemPlan[] = []
    for (const idempresa of companyIds) {
      await assertNotCancelled()
      const firstPage = await fetchItensByDatePage(config, tokens, idempresa, analysisStart, endDate, 1)
      itemPlans.push({ idempresa, firstPage, totalPages: getItensTotalPages(firstPage) })
    }

    totalPages = Math.max(
      headerPlans.reduce((t, p) => t + p.totalPages, 0)
      + itemPlans.reduce((t, p) => t + p.totalPages, 0),
      1,
    )

    await pushProgress(progressInput('starting', `Lendo vendas desde ${analysisStart} (${companyIds.length} empresas).`))

    // -------- Fase A: cabecalhos das notas (55/65) --------
    for (const plan of headerPlans as CompanyModelPlan[]) {
      for (let page = 1; page <= plan.totalPages; page += 1) {
        await assertNotCancelled()
        const docsResult = page === 1
          ? plan.firstPage
          : await fetchDocumentosPage(config, tokens, plan.idempresa, plan.modelo, headerStart, endDate, page)
        if (!docsResult.data.length) break

        const nowIso = new Date().toISOString()
        const notaRows: IntegrimNotaUpsertRow[] = []
        for (const record of docsResult.data) {
          if (isNotaCancelada(record)) continue
          const row = buildNotaRow(record, runId, nowIso)
          if (row) notaRows.push(row)
        }

        if (notaRows.length && !dryRun) await upsertNotas(adminClient!, notaRows, assertNotCancelled)
        counters.notasTotal += notaRows.length
        counters.upsertedRows += notaRows.length
        processedPages += 1

        await pushProgress(progressInput('reading', `Notas empresa ${plan.idempresa} (modelo ${plan.modelo}): ${counters.notasTotal}.`, {
          currentCompany: plan.idempresa,
          currentModelo: plan.modelo,
          currentPage: page,
        }))
        await yieldToEventLoop()
      }
    }

    // -------- Fase B: agregacao de itens de venda --------
    const aggregator = new ProdutoValorAggregator()
    for (const plan of itemPlans) {
      for (let page = 1; page <= plan.totalPages; page += 1) {
        await assertNotCancelled()
        const itemsResult = page === 1
          ? plan.firstPage
          : await fetchItensByDatePage(config, tokens, plan.idempresa, analysisStart, endDate, page)
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

    if (!dryRun) {
      const baseRows = aggregator.toRows()
      counters.upsertedRows += baseRows.length

      await pushProgress(progressInput('upserting', `Gravando analise de ${baseRows.length} produtos.`))
      await rebuildProdutoValorBase(adminClient!, baseRows, assertNotCancelled)

      await pushProgress(progressInput('aggregating', 'Cruzando com estoque e calculando score.'))
      await finalizeProdutoValor(adminClient!)

      if (deactivateStale) {
        await pushProgress(progressInput('deactivating', 'Desativando notas que sumiram da janela.'))
        counters.deactivatedRows = await deactivateStaleRows(adminClient!, headerStart, runId, assertNotCancelled)
      }

      const doneProgress = buildProgress(progressInput('done', 'Sincronizacao concluida.'))
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
    if (error instanceof IntegrimNotasSyncCancelled) {
      const now = new Date().toISOString()
      const cancelledProgress = buildProgress(progressInput('cancelled', 'Sincronizacao cancelada pelo usuario.'))
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
