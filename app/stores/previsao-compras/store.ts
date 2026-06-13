import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getApiErrorMessage } from '../../utils/api-errors'
import { getApiFetch } from '../../utils/api-fetch'
import type {
  IntegrimNotasCancelSyncResponse,
  IntegrimNotasSyncRequest,
  IntegrimNotasSyncResponse,
  IntegrimNotasSyncRun,
  IntegrimNotasSyncStatusResponse,
  IntegrimProdutoValor,
  IntegrimProdutoValorQuery,
  IntegrimProdutoValorResponse,
  IntegrimProdutoValorSort,
  IntegrimProdutoValorStats,
} from '../../../shared/types/IntegrimNotas'

type FetchProdutosOptions = {
  append?: boolean
}

const SYNC_POLL_INTERVAL_MS = 1500

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const defaultStats = (): IntegrimProdutoValorStats => ({
  total_produtos: 0,
  faturamento_365d_total: 0,
  margem_365d_total: 0,
  produtos_em_risco: 0,
  ultima_sincronizacao: null,
})

const mergeProdutos = (current: IntegrimProdutoValor[], incoming: IntegrimProdutoValor[]) => {
  const byKey = new Map<string, IntegrimProdutoValor>()
  for (const produto of current) byKey.set(produto.id, produto)
  for (const produto of incoming) byKey.set(produto.id, produto)
  return [...byKey.values()]
}

export const usePrevisaoComprasStore = defineStore('previsao-compras', () => {
  const produtos = ref<IntegrimProdutoValor[]>([])
  const runs = ref<IntegrimNotasSyncRun[]>([])
  const latestRun = ref<IntegrimNotasSyncRun | null>(null)
  const stats = ref<IntegrimProdutoValorStats>(defaultStats())
  const lastSyncResult = ref<IntegrimNotasSyncResponse | null>(null)
  const page = ref(1)
  const pageSize = ref(50)
  const totalItens = ref(0)
  const totalPaginas = ref(1)
  const sort = ref<IntegrimProdutoValorSort>('score_valor')
  const loadingProdutos = ref(false)
  const loadingStatus = ref(false)
  const syncing = ref(false)
  const cancelling = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  let syncPollingTimer: ReturnType<typeof setInterval> | null = null

  const syncProgress = computed(() => latestRun.value?.progress || null)
  const syncProgressPercent = computed(() => {
    const progress = syncProgress.value
    if (!progress) return syncing.value ? 1 : 0
    return Math.min(100, Math.max(0, Number(progress.progress_percent || 0)))
  })

  const clearMessages = () => {
    errorMessage.value = ''
    successMessage.value = ''
  }

  const fetchProdutos = async (
    filters: IntegrimProdutoValorQuery = {},
    options: FetchProdutosOptions = {},
  ) => {
    loadingProdutos.value = true
    clearMessages()

    try {
      const data = await getApiFetch()<IntegrimProdutoValorResponse>('/api/integrim-notas/analise', {
        query: {
          search: filters.search?.trim() || undefined,
          idempresa: filters.idempresa || undefined,
          sort: filters.sort || sort.value,
          page: filters.page,
          page_size: filters.page_size,
        },
      })

      produtos.value = options.append
        ? mergeProdutos(produtos.value, data.produtos || [])
        : data.produtos || []
      page.value = data.meta.page
      pageSize.value = data.meta.page_size
      totalItens.value = data.meta.total_itens
      totalPaginas.value = data.meta.total_paginas
      stats.value = data.stats
      if (filters.sort) sort.value = filters.sort
      return produtos.value
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar a previsao de compras.')
      return []
    }
    finally {
      loadingProdutos.value = false
    }
  }

  const fetchSyncStatus = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) loadingStatus.value = true

    try {
      const data = await getApiFetch()<IntegrimNotasSyncStatusResponse>('/api/integrim-notas/sync-status')
      runs.value = data.runs || []
      latestRun.value = data.latest || null
      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao consultar a sincronizacao das notas do Integrim.')
      return null
    }
    finally {
      if (!options.silent) loadingStatus.value = false
    }
  }

  const stopSyncPolling = () => {
    if (!syncPollingTimer) return
    clearInterval(syncPollingTimer)
    syncPollingTimer = null
  }

  const startSyncPolling = () => {
    stopSyncPolling()
    syncPollingTimer = setInterval(async () => {
      const data = await fetchSyncStatus({ silent: true })
      if (!syncing.value && !cancelling.value && data?.latest?.status !== 'running') {
        stopSyncPolling()
      }
    }, SYNC_POLL_INTERVAL_MS)
  }

  const findRun = (data: IntegrimNotasSyncStatusResponse | null, runId: string) => {
    if (!data) return null
    return data.runs.find(run => run.id === runId)
      || (data.latest?.id === runId ? data.latest : null)
  }

  const waitForSyncRun = async (runId: string): Promise<IntegrimNotasSyncRun | null> => {
    while (true) {
      const data = await fetchSyncStatus({ silent: true })
      const run = findRun(data, runId)
      if (run && run.status !== 'running') return run
      await delay(SYNC_POLL_INTERVAL_MS)
    }
  }

  const resumeSyncTrackingIfRunning = () => {
    if (latestRun.value?.status === 'running') startSyncPolling()
  }

  const syncNow = async (payload: IntegrimNotasSyncRequest = {}) => {
    syncing.value = true
    clearMessages()

    try {
      const data = await getApiFetch()<IntegrimNotasSyncResponse>('/api/integrim-notas/sync', {
        method: 'POST',
        body: payload,
      })

      lastSyncResult.value = data

      if (data.dry_run) {
        successMessage.value = `Teste concluido: ${data.notas_total} notas lidas da Integrim.`
        await fetchSyncStatus()
        return data
      }

      const finishedRun = await waitForSyncRun(data.run_id)

      if (!finishedRun || finishedRun.status === 'success') {
        successMessage.value = `Sincronizacao concluida: ${finishedRun?.notas_total ?? 0} notas e ${finishedRun?.itens_total ?? 0} itens.`
      }
      else if (finishedRun.status === 'cancelled') {
        successMessage.value = 'Sincronizacao cancelada com seguranca.'
      }
      else {
        errorMessage.value = finishedRun.error_message || 'Falha ao sincronizar as notas do Integrim.'
      }

      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao sincronizar as notas do Integrim.')
      return null
    }
    finally {
      syncing.value = false
      stopSyncPolling()
      await fetchSyncStatus({ silent: true })
    }
  }

  const cancelSync = async (runId?: string | null) => {
    cancelling.value = true
    clearMessages()

    try {
      const data = await getApiFetch()<IntegrimNotasCancelSyncResponse>('/api/integrim-notas/cancel', {
        method: 'POST',
        body: { run_id: runId || latestRun.value?.id || null },
      })

      successMessage.value = data.message
      await fetchSyncStatus({ silent: true })
      if (data.cancel_requested && !data.cancelled) startSyncPolling()
      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao parar a sincronizacao das notas do Integrim.')
      return null
    }
    finally {
      cancelling.value = false
    }
  }

  const reset = () => {
    produtos.value = []
    runs.value = []
    latestRun.value = null
    stats.value = defaultStats()
    lastSyncResult.value = null
    page.value = 1
    pageSize.value = 50
    totalItens.value = 0
    totalPaginas.value = 1
    sort.value = 'score_valor'
    loadingProdutos.value = false
    loadingStatus.value = false
    syncing.value = false
    cancelling.value = false
    stopSyncPolling()
    errorMessage.value = ''
    successMessage.value = ''
  }

  return {
    produtos,
    runs,
    latestRun,
    stats,
    lastSyncResult,
    page,
    pageSize,
    totalItens,
    totalPaginas,
    sort,
    loadingProdutos,
    loadingStatus,
    syncing,
    cancelling,
    errorMessage,
    successMessage,
    syncProgress,
    syncProgressPercent,
    clearMessages,
    fetchProdutos,
    fetchSyncStatus,
    resumeSyncTrackingIfRunning,
    syncNow,
    cancelSync,
    reset,
  }
})
