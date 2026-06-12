import { randomUUID } from 'node:crypto'
import type {
  StockIntegrinProduto,
  StockIntegrinSyncResponse,
} from '../../../../shared/types/StockIntegrin'
import { DEFAULT_MAX_PAGES } from './constants'
import { getIntegrimConfig } from './config'
import {
  createCompanyPagePlans,
  fetchSaldoPage,
  getFreshAccessToken,
} from './integrim-client'
import {
  createAdminClient,
  deactivateStaleRows,
  finishSyncRun,
  isSyncCancelRequested,
  refreshStockIntegrinSummary,
  startSyncRun,
  updateSyncProgress,
} from './repository'
import { processSaldoPage } from './page-processor'
import type {
  CompanyPagePlan,
  IntegrimRecord,
  StockIntegrinSyncCounters,
  StockIntegrinSyncOptions,
} from './types'
import { IntegrimHttpError } from './types'
import {
  buildProgress,
  normalizeCompanyIds,
  normalizeSyncErrorMessage,
  sameSourceKey,
  toInteger,
  yieldToEventLoop,
} from './utils'

const emptyCounters = (): StockIntegrinSyncCounters => ({
  cadProdutosTotal: 0,
  precosTotal: 0,
  saldosTotal: 0,
  upsertedRows: 0,
  deactivatedRows: 0,
})

class StockIntegrinSyncCancelled extends Error {
  constructor() {
    super('Sincronizacao cancelada pelo usuario.')
    this.name = 'StockIntegrinSyncCancelled'
  }
}

const getTotalPages = (plans: CompanyPagePlan[]) => {
  return plans.reduce((total, plan) => total + plan.totalPages, 0)
}

const getEstimatedRows = (plans: CompanyPagePlan[]) => {
  return plans.reduce((total, plan) => total + plan.totalRows, 0)
}

const splitCompleteProductRows = (rows: IntegrimRecord[], keepLastProductOpen: boolean) => {
  if (!keepLastProductOpen || rows.length <= 1) {
    return {
      completeRows: rows,
      pendingRows: [] as IntegrimRecord[],
    }
  }

  const last = rows[rows.length - 1]
  let splitIndex = rows.length - 1

  while (splitIndex > 0 && sameSourceKey(rows[splitIndex - 1], last)) {
    splitIndex -= 1
  }

  return {
    completeRows: rows.slice(0, splitIndex),
    pendingRows: rows.slice(splitIndex),
  }
}

const updateProgressIfNeeded = async (
  dryRun: boolean,
  adminClient: ReturnType<typeof createAdminClient> | null,
  runId: string,
  metadata: Record<string, unknown>,
  counters: StockIntegrinSyncCounters,
  progressInput: Parameters<typeof buildProgress>[0],
) => {
  if (dryRun || !adminClient) return

  await updateSyncProgress(
    adminClient,
    runId,
    metadata,
    buildProgress(progressInput),
    counters,
  )
}

const assertSyncNotCancelled = async (
  dryRun: boolean,
  adminClient: ReturnType<typeof createAdminClient> | null,
  runId: string,
) => {
  if (dryRun || !adminClient) return

  if (await isSyncCancelRequested(adminClient, runId)) {
    throw new StockIntegrinSyncCancelled()
  }
}

export const runStockIntegrinSync = async (options: StockIntegrinSyncOptions = {}): Promise<StockIntegrinSyncResponse> => {
  const config = getIntegrimConfig()
  const companyIds = normalizeCompanyIds(options.companyIds, config.companyIds)
  const maxPages = Math.min(Math.max(toInteger(options.maxPages) || DEFAULT_MAX_PAGES, 1), DEFAULT_MAX_PAGES)
  const dryRun = Boolean(options.dryRun)
  const deactivateStale = options.deactivateStale ?? (!dryRun && !options.maxPages)
  const triggeredBy = String(options.triggeredBy || (dryRun ? 'dry-run' : 'manual')).slice(0, 80)
  const adminClient = dryRun ? null : createAdminClient()
  const metadata = {
    company_ids: companyIds,
    max_pages: maxPages,
    page_size: 1000,
    partial: maxPages < DEFAULT_MAX_PAGES,
    deactivate_stale: deactivateStale,
    cancel_requested: false,
  }
  const runId = dryRun ? randomUUID() : await startSyncRun(adminClient!, triggeredBy, metadata)
  await options.onStarted?.(runId)
  const counters = emptyCounters()
  const cadKeys = new Set<string>()
  const precoKeys = new Set<string>()
  const samples: StockIntegrinProduto[] = []
  let totalPages = 1
  let processedPages = 0
  let totalSaldosEstimated = 0

  try {
    await assertSyncNotCancelled(dryRun, adminClient, runId)
    const token = await getFreshAccessToken(config)
    await assertSyncNotCancelled(dryRun, adminClient, runId)
    const plans = await createCompanyPagePlans(config, token, companyIds, maxPages)
    totalPages = Math.max(getTotalPages(plans), 1)
    totalSaldosEstimated = getEstimatedRows(plans)

    await updateProgressIfNeeded(dryRun, adminClient, runId, metadata, counters, {
      phase: 'starting',
      totalPages,
      processedPages,
      totalSaldosEstimated,
      processedSaldos: counters.saldosTotal,
      upsertedRows: counters.upsertedRows,
      deactivatedRows: counters.deactivatedRows,
      message: 'Preparando leitura por lotes da Integrim.',
    })
    await assertSyncNotCancelled(dryRun, adminClient, runId)

    for (const plan of plans) {
      let pendingRows: IntegrimRecord[] = []

      for (let page = 1; page <= plan.totalPages; page += 1) {
        await assertSyncNotCancelled(dryRun, adminClient, runId)

        const saldosResult = page === 1
          ? plan.firstPage
          : await fetchSaldoPage(config, token, plan.idempresa, page)
        await assertSyncNotCancelled(dryRun, adminClient, runId)

        if (!saldosResult.data.length) break

        await updateProgressIfNeeded(dryRun, adminClient, runId, metadata, counters, {
          phase: 'reading',
          totalPages,
          processedPages,
          totalSaldosEstimated,
          processedSaldos: counters.saldosTotal,
          upsertedRows: counters.upsertedRows,
          deactivatedRows: counters.deactivatedRows,
          currentCompany: plan.idempresa,
          currentPage: page,
          message: `Lendo empresa ${plan.idempresa}, pagina ${page} de ${plan.totalPages}.`,
        })
        await assertSyncNotCancelled(dryRun, adminClient, runId)

        const combinedRows = [...pendingRows, ...saldosResult.data]
        const { completeRows, pendingRows: nextPendingRows } = splitCompleteProductRows(
          combinedRows,
          page < plan.totalPages && saldosResult.hasNext,
        )
        pendingRows = nextPendingRows

        if (!completeRows.length) {
          continue
        }

        const pageResult = await processSaldoPage({
          config,
          token,
          runId,
          idempresa: plan.idempresa,
          saldos: completeRows,
          dryRun,
          adminClient,
          cadKeys,
          precoKeys,
          samples,
          beforeChunk: () => assertSyncNotCancelled(dryRun, adminClient, runId),
        })
        await assertSyncNotCancelled(dryRun, adminClient, runId)

        counters.saldosTotal += pageResult.saldos
        counters.upsertedRows += pageResult.upsertedRows
        counters.cadProdutosTotal = cadKeys.size
        counters.precosTotal = precoKeys.size
        processedPages += 1

        await updateProgressIfNeeded(dryRun, adminClient, runId, metadata, counters, {
          phase: 'upserting',
          totalPages,
          processedPages,
          totalSaldosEstimated,
          processedSaldos: counters.saldosTotal,
          upsertedRows: counters.upsertedRows,
          deactivatedRows: counters.deactivatedRows,
          currentCompany: plan.idempresa,
          currentPage: page,
          message: `${counters.upsertedRows} linhas atualizadas no Supabase.`,
        })
        await assertSyncNotCancelled(dryRun, adminClient, runId)

        await yieldToEventLoop()
      }

      if (pendingRows.length) {
        await assertSyncNotCancelled(dryRun, adminClient, runId)

        const pageResult = await processSaldoPage({
          config,
          token,
          runId,
          idempresa: plan.idempresa,
          saldos: pendingRows,
          dryRun,
          adminClient,
          cadKeys,
          precoKeys,
          samples,
          beforeChunk: () => assertSyncNotCancelled(dryRun, adminClient, runId),
        })
        await assertSyncNotCancelled(dryRun, adminClient, runId)

        counters.saldosTotal += pageResult.saldos
        counters.upsertedRows += pageResult.upsertedRows
        counters.cadProdutosTotal = cadKeys.size
        counters.precosTotal = precoKeys.size
      }
    }

    if (!dryRun && deactivateStale) {
      await assertSyncNotCancelled(dryRun, adminClient, runId)
      await updateProgressIfNeeded(dryRun, adminClient, runId, metadata, counters, {
        phase: 'deactivating',
        totalPages,
        processedPages,
        totalSaldosEstimated,
        processedSaldos: counters.saldosTotal,
        upsertedRows: counters.upsertedRows,
        deactivatedRows: counters.deactivatedRows,
        message: 'Desativando linhas antigas em pequenos lotes.',
      })

      counters.deactivatedRows = await deactivateStaleRows(adminClient!, companyIds, runId, async (deactivatedRows) => {
        counters.deactivatedRows = deactivatedRows
        await updateProgressIfNeeded(dryRun, adminClient, runId, metadata, counters, {
          phase: 'deactivating',
          totalPages,
          processedPages,
          totalSaldosEstimated,
          processedSaldos: counters.saldosTotal,
          upsertedRows: counters.upsertedRows,
          deactivatedRows: counters.deactivatedRows,
          message: `${deactivatedRows} linhas antigas desativadas.`,
        })
        await yieldToEventLoop()
      }, () => assertSyncNotCancelled(dryRun, adminClient, runId))
    }

    if (!dryRun) {
      const doneProgress = buildProgress({
        phase: 'done',
        totalPages,
        processedPages,
        totalSaldosEstimated,
        processedSaldos: counters.saldosTotal,
        upsertedRows: counters.upsertedRows,
        deactivatedRows: counters.deactivatedRows,
        message: 'Sincronizacao concluida.',
      })

      await finishSyncRun(adminClient!, runId, 'success', {
        cad_produtos_total: counters.cadProdutosTotal,
        precos_total: counters.precosTotal,
        saldos_total: counters.saldosTotal,
        upserted_rows: counters.upsertedRows,
        deactivated_rows: counters.deactivatedRows,
        error_message: null,
        metadata: {
          ...metadata,
          progress: doneProgress,
        },
      })

      await refreshStockIntegrinSummary(adminClient!)
    }

    return {
      success: true,
      dry_run: dryRun,
      run_id: runId,
      cad_produtos_total: counters.cadProdutosTotal,
      precos_total: counters.precosTotal,
      saldos_total: counters.saldosTotal,
      upserted_rows: counters.upsertedRows,
      deactivated_rows: counters.deactivatedRows,
      companies: companyIds,
      ...(dryRun ? { samples } : {}),
    }
  }
  catch (error) {
    if (error instanceof StockIntegrinSyncCancelled) {
      const now = new Date().toISOString()
      const cancelledProgress = buildProgress({
        phase: 'cancelled',
        totalPages,
        processedPages,
        totalSaldosEstimated,
        processedSaldos: counters.saldosTotal,
        upsertedRows: counters.upsertedRows,
        deactivatedRows: counters.deactivatedRows,
        message: 'Sincronizacao cancelada pelo usuario.',
      })

      if (!dryRun && adminClient) {
        await finishSyncRun(adminClient, runId, 'cancelled', {
          cad_produtos_total: counters.cadProdutosTotal,
          precos_total: counters.precosTotal,
          saldos_total: counters.saldosTotal,
          upserted_rows: counters.upsertedRows,
          deactivated_rows: counters.deactivatedRows,
          error_message: null,
          cancel_requested: true,
          cancel_requested_at: now,
          metadata: {
            ...metadata,
            cancel_requested: true,
            cancel_requested_at: now,
            progress: cancelledProgress,
          },
        })
      }

      return {
        success: true,
        dry_run: dryRun,
        run_id: runId,
        cancelled: true,
        cad_produtos_total: counters.cadProdutosTotal,
        precos_total: counters.precosTotal,
        saldos_total: counters.saldosTotal,
        upserted_rows: counters.upsertedRows,
        deactivated_rows: counters.deactivatedRows,
        companies: companyIds,
        ...(dryRun ? { samples } : {}),
      }
    }

    const message = normalizeSyncErrorMessage(error)
    const failedProgress = buildProgress({
      phase: 'failed',
      totalPages,
      processedPages,
      totalSaldosEstimated,
      processedSaldos: counters.saldosTotal,
      upsertedRows: counters.upsertedRows,
      deactivatedRows: counters.deactivatedRows,
      message,
    })

    if (!dryRun && adminClient) {
      await finishSyncRun(adminClient, runId, 'failed', {
        error_message: message,
        metadata: {
          ...metadata,
          progress: failedProgress,
        },
      })
    }

    if (error instanceof IntegrimHttpError) {
      throw createError({
        statusCode: 502,
        statusMessage: message,
      })
    }

    throw error
  }
}
