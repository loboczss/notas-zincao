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
import { DEFAULT_WINDOW_MONTHS, FETCH_CONCURRENCY } from './constants'
import {
  createAdminClient,
  finalizeProdutoValor,
  finishSyncRun,
  isSyncCancelRequested,
  rebuildProdutoValorBase,
  rebuildProdutoVendaDia,
  rebuildVendaVendedorDia,
  startSyncRun,
  updateSyncProgress,
} from './repository'
import type {
  IntegrimNotasSyncCounters,
  IntegrimNotasSyncOptions,
} from './types'
import { buildProgress, resolveSyncRange } from './utils'

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

// Processa uma fila de tarefas com no maximo `concurrency` em voo. O gargalo do
// sync e a latencia por consulta do Integrim, entao varias requisicoes em
// paralelo multiplicam a vazao. A funcao roda de forma sequencial dentro de cada
// worker, mantendo a agregacao (single-thread) consistente nos callbacks.
const runPool = async <T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) => {
  if (!items.length) return
  let cursor = 0
  const lanes = Math.max(1, Math.min(concurrency, items.length))
  await Promise.all(
    Array.from({ length: lanes }, async () => {
      while (cursor < items.length) {
        const item = items[cursor]!
        cursor += 1
        await worker(item)
      }
    }),
  )
}

export const runIntegrimNotasSync = async (
  options: IntegrimNotasSyncOptions = {},
): Promise<IntegrimNotasSyncResponse> => {
  const config = getIntegrimNotasConfig()
  const companyIds = options.companyIds?.length ? [...new Set(options.companyIds)] : config.companyIds
  const windowMonths = Math.max(1, toInteger(options.windowMonths) || DEFAULT_WINDOW_MONTHS)
  // Intervalo explicito escolhido no front tem prioridade sobre a janela por meses.
  const { startDate, endDate } = resolveSyncRange(options.startDate, options.endDate, windowMonths)
  const dryRun = Boolean(options.dryRun)
  const triggeredBy = String(options.triggeredBy || (dryRun ? 'dry-run' : 'manual')).slice(0, 80)
  const adminClient = dryRun ? null : createAdminClient()

  const metadata = {
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

    // Primeira pagina de itens de cada empresa em paralelo (define o plano de leitura).
    const itemPlans: ItemPlan[] = new Array(companyIds.length)
    await runPool(
      companyIds.map((idempresa, index) => ({ idempresa, index })),
      FETCH_CONCURRENCY,
      async ({ idempresa, index }) => {
        await assertNotCancelled()
        const firstPage = await fetchItensByDatePage(config, tokens, idempresa, startDate, endDate, 1)
        itemPlans[index] = { idempresa, firstPage, totalPages: getItensTotalPages(firstPage) }
      },
    )

    totalPages = Math.max(itemPlans.reduce((t, p) => t + p.totalPages, 0), 1)

    await pushProgress(progressInput('starting', `Lendo vendas desde ${startDate} (${companyIds.length} empresas).`))

    // -------- Agregacao de itens de venda --------
    const aggregator = new ProdutoValorAggregator()

    // Pagina 1 de cada empresa ja veio no plano: agrega de imediato.
    for (const plan of itemPlans) {
      for (const record of plan.firstPage.data) aggregator.add(record)
      counters.itensTotal += plan.firstPage.data.length
      processedPages += 1
    }

    // Demais paginas (2..N) de todas as empresas baixadas em paralelo. A agregacao
    // roda no callback (single-thread), entao counters/aggregator ficam consistentes.
    const itemJobs: Array<{ idempresa: number, page: number }> = []
    for (const plan of itemPlans) {
      for (let page = 2; page <= plan.totalPages; page += 1) {
        itemJobs.push({ idempresa: plan.idempresa, page })
      }
    }

    await runPool(itemJobs, FETCH_CONCURRENCY, async ({ idempresa, page }) => {
      await assertNotCancelled()
      const itemsResult = await fetchItensByDatePage(config, tokens, idempresa, startDate, endDate, page)
      for (const record of itemsResult.data) aggregator.add(record)
      counters.itensTotal += itemsResult.data.length
      processedPages += 1

      await pushProgress(progressInput('reading', `Vendas empresa ${idempresa}: ${counters.itensTotal} itens lidos.`, {
        currentCompany: idempresa,
        currentPage: page,
      }))
      await yieldToEventLoop()
    })

    if (!dryRun) {
      const baseRows = aggregator.toRows()
      const dailyRows = aggregator.toDailyRows()
      const vendedorRows = aggregator.toVendedorRows()
      counters.upsertedRows += baseRows.length + dailyRows.length + vendedorRows.length

      await pushProgress(progressInput('upserting', `Gravando analise de ${baseRows.length} produtos.`))
      await rebuildProdutoValorBase(adminClient!, baseRows, assertNotCancelled)

      await pushProgress(progressInput('upserting', `Gravando vendas diarias de ${dailyRows.length} produto/dia.`))
      await rebuildProdutoVendaDia(adminClient!, dailyRows, runId, assertNotCancelled)

      await pushProgress(progressInput('upserting', `Gravando vendas por vendedor (${vendedorRows.length} vendedor/dia).`))
      await rebuildVendaVendedorDia(adminClient!, vendedorRows, runId, assertNotCancelled)

      await pushProgress(progressInput('aggregating', 'Cruzando com estoque e calculando score.'))
      await finalizeProdutoValor(adminClient!)

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
