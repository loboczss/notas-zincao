import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getApiErrorMessage } from '../../utils/api-errors'
import { getApiFetch } from '../../utils/api-fetch'
import type {
  StockIntegrinCancelSyncResponse,
  StockIntegrinListQuery,
  StockIntegrinListResponse,
  StockIntegrinProduto,
  StockIntegrinStats,
  StockIntegrinSyncRequest,
  StockIntegrinSyncResponse,
  StockIntegrinSyncRun,
  StockIntegrinSyncStatusResponse,
} from '../../../shared/types/StockIntegrin'

type FetchProdutosOptions = {
  append?: boolean
}

const defaultStats = (): StockIntegrinStats => ({
  saldo_disponivel_total: 0,
  empresas: [],
  locais: [],
  ultima_sincronizacao: null,
})

const mergeProdutos = (current: StockIntegrinProduto[], incoming: StockIntegrinProduto[]) => {
  const byKey = new Map<string, StockIntegrinProduto>()

  for (const produto of current) {
    byKey.set(produto.id, produto)
  }

  for (const produto of incoming) {
    byKey.set(produto.id, produto)
  }

  return [...byKey.values()]
}

export const useStockIntegrinStore = defineStore('stock-integrin', () => {
  const produtos = ref<StockIntegrinProduto[]>([])
  const runs = ref<StockIntegrinSyncRun[]>([])
  const latestRun = ref<StockIntegrinSyncRun | null>(null)
  const stats = ref<StockIntegrinStats>(defaultStats())
  const lastSyncResult = ref<StockIntegrinSyncResponse | null>(null)
  const page = ref(1)
  const pageSize = ref(50)
  const totalItens = ref(0)
  const totalPaginas = ref(1)
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
    filters: StockIntegrinListQuery = {},
    options: FetchProdutosOptions = {},
  ) => {
    loadingProdutos.value = true
    clearMessages()

    try {
      const data = await getApiFetch()<StockIntegrinListResponse>('/api/stock-integrin/list', {
        query: {
          search: filters.search?.trim() || undefined,
          idempresa: filters.idempresa || undefined,
          idlocalestoque: filters.idlocalestoque || undefined,
          only_available: filters.only_available || undefined,
          page: filters.page,
          page_size: filters.page_size ?? filters.limit,
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
      return produtos.value
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar o Stock Integrin.')
      return []
    }
    finally {
      loadingProdutos.value = false
    }
  }

  const fetchSyncStatus = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      loadingStatus.value = true
    }

    try {
      const data = await getApiFetch()<StockIntegrinSyncStatusResponse>('/api/stock-integrin/sync-status')
      runs.value = data.runs || []
      latestRun.value = data.latest || null
      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao consultar a sincronizacao do Stock Integrin.')
      return null
    }
    finally {
      if (!options.silent) {
        loadingStatus.value = false
      }
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
    }, 1500)
  }

  const syncNow = async (payload: StockIntegrinSyncRequest = {}) => {
    syncing.value = true
    clearMessages()
    startSyncPolling()

    try {
      const data = await getApiFetch()<StockIntegrinSyncResponse>('/api/stock-integrin/sync', {
        method: 'POST',
        body: payload,
      })

      lastSyncResult.value = data
      successMessage.value = data.cancelled
        ? 'Sincronizacao cancelada com seguranca.'
        : data.dry_run
        ? `Teste concluido: ${data.saldos_total} saldos lidos da Integrim.`
        : `Sincronizacao concluida: ${data.upserted_rows} linhas atualizadas.`
      await fetchSyncStatus()
      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao sincronizar o Stock Integrin.')
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
      const data = await getApiFetch()<StockIntegrinCancelSyncResponse>('/api/stock-integrin/cancel', {
        method: 'POST',
        body: {
          run_id: runId || latestRun.value?.id || null,
        },
      })

      successMessage.value = data.message
      await fetchSyncStatus({ silent: true })

      if (data.cancel_requested && !data.cancelled) {
        startSyncPolling()
      }

      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao parar a sincronizacao do Stock Integrin.')
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
    syncNow,
    cancelSync,
    reset,
  }
})
