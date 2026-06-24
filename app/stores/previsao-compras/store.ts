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
  IntegrimCompraAiDashboardResponse,
  IntegrimCompraAiTaskResponse,
  IntegrimCompraAiTaskUpsertRequest,
  IntegrimCompraOportunidadeActionResponse,
  IntegrimCompraOportunidadeStatus,
  IntegrimCompraParametros,
  IntegrimCompraParametrosUpdateRequest,
  IntegrimCompraTaskRunResponse,
  IntegrimListaCompraQuery,
  IntegrimListaCompraResponse,
  IntegrimListaCompraRow,
  IntegrimListaCompraStats,
  IntegrimProdutoValor,
  IntegrimProdutoValorQuery,
  IntegrimProdutoValorResponse,
  IntegrimProdutoValorSort,
  IntegrimProdutoValorStats,
  IntegrimSazonalidadeResponse,
  IntegrimSyncHealth,
  IntegrimSyncHealthResponse,
  IntegrimSyncSchedule,
  IntegrimSyncScheduleResponse,
  IntegrimSyncScheduleUpdateRequest,
  IntegrimVendaDiaCoverage,
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
  faturamento_periodo_total: 0,
  margem_periodo_total: 0,
  produtos_em_risco: 0,
  oportunidades_ia: 0,
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
  const aiDashboard = ref<IntegrimCompraAiDashboardResponse | null>(null)
  const lastSyncResult = ref<IntegrimNotasSyncResponse | null>(null)
  const page = ref(1)
  const pageSize = ref(50)
  const totalItens = ref(0)
  const totalPaginas = ref(1)
  const sort = ref<IntegrimProdutoValorSort>('score_valor')
  const loadingProdutos = ref(false)
  const loadingStatus = ref(false)
  const loadingAiDashboard = ref(false)
  const aiActionLoading = ref(false)
  const syncing = ref(false)
  const cancelling = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const coverage = ref<IntegrimVendaDiaCoverage | null>(null)
  const health = ref<IntegrimSyncHealth | null>(null)
  const schedule = ref<IntegrimSyncSchedule | null>(null)
  const compraParametros = ref<IntegrimCompraParametros | null>(null)
  const sazonalidade = ref<IntegrimSazonalidadeResponse | null>(null)
  const sazonalidadeAno = ref<number | null>(null)
  const sazonalidadeMesInicio = ref<number>(1)
  const listaCompra = ref<IntegrimListaCompraRow[]>([])
  const listaCompraStats = ref<IntegrimListaCompraStats | null>(null)
  const listaCompraTotalItens = ref(0)
  const listaCompraTotalPaginas = ref(1)
  const loadingListaCompra = ref(false)
  const loadingHealth = ref(false)
  const loadingSchedule = ref(false)
  const loadingInsights = ref(false)
  const savingConfig = ref(false)
  const produtoSelecionado = ref<IntegrimProdutoValor | null>(null)
  const produtoModalAberto = computed({
    get: () => Boolean(produtoSelecionado.value),
    set: (value: boolean) => {
      if (!value) produtoSelecionado.value = null
    },
  })
  let syncPollingTimer: ReturnType<typeof setInterval> | null = null
  let aiTaskPollingTimer: ReturnType<typeof setInterval> | null = null

  const syncProgress = computed(() => latestRun.value?.progress || null)
  const syncProgressPercent = computed(() => {
    const progress = syncProgress.value
    if (!progress) return syncing.value ? 1 : 0
    return Math.min(100, Math.max(0, Number(progress.progress_percent || 0)))
  })

  const aiTaskRunning = ref(false)
  const aiTaskProgressPercent = ref(0)
  const aiTaskProgressMessage = ref('')
  const aiTaskProgressDetail = ref('')

  const stopAiTaskPolling = () => {
    if (!aiTaskPollingTimer) return
    clearInterval(aiTaskPollingTimer)
    aiTaskPollingTimer = null
  }

  const startAiTaskPolling = () => {
    stopAiTaskPolling()
    aiTaskPollingTimer = setInterval(async () => {
      const data = await fetchAiDashboard({ silent: true })
      const runningRun = data?.runs?.find(r => r.status === 'running')
      if (runningRun) {
        aiTaskRunning.value = true
        const progress = Number(runningRun.result_summary?.progress ?? 0)
        const processed = Number(runningRun.result_summary?.processed_batches ?? 0)
        const total = Number(runningRun.result_summary?.total_batches ?? 1)
        
        aiTaskProgressPercent.value = progress
        aiTaskProgressMessage.value = 'IA pesquisando oportunidades...'
        aiTaskProgressDetail.value = `Processando lote ${processed} de ${total}`
      } else {
        stopAiTaskPolling()
        aiTaskRunning.value = false
        aiTaskProgressPercent.value = 0
        aiTaskProgressMessage.value = ''
        aiTaskProgressDetail.value = ''
      }
    }, 2000)
  }

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
      const data = await getApiFetch()<IntegrimProdutoValorResponse>('/api/integrim-notas/catalog/produtos', {
        query: {
          search: filters.search?.trim() || undefined,
          idempresa: filters.idempresa || undefined,
          sort: filters.sort || sort.value,
          page: filters.page,
          page_size: filters.page_size,
          date_start: filters.date_start || undefined,
          date_end: filters.date_end || undefined,
          coverage_days: filters.coverage_days || undefined,
          compare_previous: filters.compare_previous ?? undefined,
          oportunidade_filter: filters.oportunidade_filter || undefined,
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
      coverage.value = data.coverage || null
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
      const data = await getApiFetch()<IntegrimNotasSyncStatusResponse>('/api/integrim-notas/sync/status')
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
      const data = await getApiFetch()<IntegrimNotasSyncResponse>('/api/integrim-notas/sync/run', {
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
      const data = await getApiFetch()<IntegrimNotasCancelSyncResponse>('/api/integrim-notas/sync/cancel', {
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

  const updateOportunidadeStatus = async (
    id: string,
    status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>,
  ) => {
    clearMessages()

    try {
      const data = await getApiFetch()<IntegrimCompraOportunidadeActionResponse>(`/api/integrim-notas/ai/oportunidades/${id}`, {
        method: 'PATCH',
        body: { status },
      })

      produtos.value = produtos.value.map((produto) => {
        if (produto.ai_oportunidade?.id !== id) return produto
        return {
          ...produto,
          ai_oportunidade: {
            ...produto.ai_oportunidade,
            status: data.status,
          },
        }
      })

      if (aiDashboard.value) {
        aiDashboard.value = {
          ...aiDashboard.value,
          oportunidades: aiDashboard.value.oportunidades.map((oportunidade) => {
            if (oportunidade.id !== id) return oportunidade
            return { ...oportunidade, status: data.status }
          }),
        }
      }

      successMessage.value = status === 'comprada'
        ? 'Oportunidade marcada como comprada.'
        : status === 'ignorada'
          ? 'Oportunidade ignorada.'
          : status === 'expirada'
            ? 'Oportunidade expirada.'
            : 'Oportunidade aceita.'

      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao atualizar a oportunidade IA.')
      return null
    }
  }

  const fetchAiDashboard = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      loadingAiDashboard.value = true
      clearMessages()
    }

    try {
      const data = await getApiFetch()<IntegrimCompraAiDashboardResponse>('/api/integrim-notas/ai/dashboard')
      aiDashboard.value = data

      // Se houver uma task rodando no dashboard, inicia o polling de progresso
      const runningRun = data?.runs?.find(r => r.status === 'running')
      if (runningRun) {
        aiTaskRunning.value = true
        startAiTaskPolling()
      } else if (aiTaskRunning.value) {
        aiTaskRunning.value = false
        stopAiTaskPolling()
      }

      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar o painel de IA.')
      return null
    }
    finally {
      if (!options.silent) loadingAiDashboard.value = false
    }
  }

  const createAiTask = async (payload: IntegrimCompraAiTaskUpsertRequest) => {
    aiActionLoading.value = true
    clearMessages()

    try {
      const data = await getApiFetch()<IntegrimCompraAiTaskResponse>('/api/integrim-notas/ai/tasks', {
        method: 'POST',
        body: payload,
      })

      successMessage.value = 'Task de IA salva.'
      await fetchAiDashboard({ silent: true })
      return data.task
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao salvar a task de IA.')
      return null
    }
    finally {
      aiActionLoading.value = false
    }
  }

  const updateAiTask = async (id: string, payload: IntegrimCompraAiTaskUpsertRequest) => {
    aiActionLoading.value = true
    clearMessages()

    try {
      const data = await getApiFetch()<IntegrimCompraAiTaskResponse>(`/api/integrim-notas/ai/tasks/${id}`, {
        method: 'PATCH',
        body: payload,
      })

      successMessage.value = 'Task de IA atualizada.'
      await fetchAiDashboard({ silent: true })
      return data.task
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao atualizar a task de IA.')
      return null
    }
    finally {
      aiActionLoading.value = false
    }
  }

  const runAiTask = async (taskId?: string | null) => {
    aiActionLoading.value = true
    clearMessages()

    aiTaskRunning.value = true
    aiTaskProgressPercent.value = 0
    aiTaskProgressMessage.value = 'Iniciando pesquisa da IA...'
    aiTaskProgressDetail.value = ''
    startAiTaskPolling()

    try {
      const data = await getApiFetch()<IntegrimCompraTaskRunResponse>('/api/integrim-notas/ai/run-task', {
        method: 'POST',
        body: { task_id: taskId || null },
      })

      if (data.status === 'success') {
        successMessage.value = `Task de IA concluida: ${data.sources_count} fontes e ${data.opportunities_count} oportunidades.`
      }
      else if (data.status === 'skipped') {
        successMessage.value = 'Nenhuma task de IA vencida para rodar agora.'
      }
      else {
        errorMessage.value = data.error_message || 'Task de IA terminou com falha.'
      }

      await fetchAiDashboard({ silent: true })
      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao rodar a task de IA.')
      return null
    }
    finally {
      aiActionLoading.value = false
      stopAiTaskPolling()
      aiTaskRunning.value = false
    }
  }

  const fetchSyncHealth = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) loadingHealth.value = true
    try {
      const data = await getApiFetch()<IntegrimSyncHealthResponse>('/api/integrim-notas/sync/health')
      health.value = data.health
      return data.health
    }
    catch (error) {
      if (!options.silent) errorMessage.value = getApiErrorMessage(error, 'Falha ao consultar a saude do sync.')
      return null
    }
    finally {
      if (!options.silent) loadingHealth.value = false
    }
  }

  const fetchSyncSchedule = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) loadingSchedule.value = true
    try {
      const data = await getApiFetch()<IntegrimSyncScheduleResponse>('/api/integrim-notas/sync/schedule')
      schedule.value = data.schedule
      return data.schedule
    }
    catch (error) {
      if (!options.silent) errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar o agendamento.')
      return null
    }
    finally {
      if (!options.silent) loadingSchedule.value = false
    }
  }

  const updateSyncSchedule = async (payload: IntegrimSyncScheduleUpdateRequest) => {
    savingConfig.value = true
    clearMessages()
    try {
      const data = await getApiFetch()<IntegrimSyncScheduleResponse>('/api/integrim-notas/sync/schedule', {
        method: 'POST',
        body: payload,
      })
      schedule.value = data.schedule
      successMessage.value = 'Agendamento salvo.'
      return data.schedule
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao salvar o agendamento.')
      return null
    }
    finally {
      savingConfig.value = false
    }
  }

  const fetchCompraParametros = async (options: { silent?: boolean } = {}) => {
    try {
      const data = await getApiFetch()<{ success: boolean, parametros: IntegrimCompraParametros }>('/api/integrim-notas/config/parametros')
      compraParametros.value = data.parametros
      return data.parametros
    }
    catch (error) {
      if (!options.silent) errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar parametros de compra.')
      return null
    }
  }

  const updateCompraParametros = async (payload: IntegrimCompraParametrosUpdateRequest) => {
    savingConfig.value = true
    clearMessages()
    try {
      const data = await getApiFetch()<{ success: boolean, parametros: IntegrimCompraParametros }>('/api/integrim-notas/config/parametros', {
        method: 'POST',
        body: payload,
      })
      compraParametros.value = data.parametros
      successMessage.value = 'Parametros de compra salvos.'
      return data.parametros
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao salvar parametros de compra.')
      return null
    }
    finally {
      savingConfig.value = false
    }
  }

  const fetchSazonalidade = async (query: {
    idempresa?: string | number | null
    idproduto?: number | null
    idsubproduto?: number | null
    ano?: number | null
    mesInicio?: number | null
  } = {}) => {
    if (query.ano !== undefined) sazonalidadeAno.value = query.ano
    if (query.mesInicio !== undefined && query.mesInicio !== null) {
      sazonalidadeMesInicio.value = query.mesInicio
    }

    try {
      const data = await getApiFetch()<IntegrimSazonalidadeResponse>('/api/integrim-notas/insights/sazonalidade', {
        query: {
          idempresa: query.idempresa || undefined,
          idproduto: query.idproduto || undefined,
          idsubproduto: query.idsubproduto || undefined,
          ano: query.ano !== undefined ? (query.ano || undefined) : (sazonalidadeAno.value || undefined),
          mesInicio: query.mesInicio !== undefined ? (query.mesInicio || undefined) : (sazonalidadeMesInicio.value || undefined),
        },
      })
      sazonalidade.value = data
      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao calcular a sazonalidade.')
      return null
    }
  }

  const fetchListaCompra = async (query: IntegrimListaCompraQuery = {}, options: { append?: boolean } = {}) => {
    loadingListaCompra.value = true
    if (!options.append) clearMessages()
    try {
      const data = await getApiFetch()<IntegrimListaCompraResponse>('/api/integrim-notas/catalog/lista-compra', {
        query: {
          idempresa: query.idempresa || undefined,
          lead_time_dias: query.lead_time_dias ?? undefined,
          coverage_days: query.coverage_days ?? undefined,
          service_level: query.service_level ?? undefined,
          horizon_days: query.horizon_days ?? undefined,
          only_buy: query.only_buy ?? undefined,
          search: query.search?.trim() || undefined,
          sort: query.sort || undefined,
          page: query.page,
          page_size: query.page_size,
        },
      })
      listaCompra.value = options.append ? [...listaCompra.value, ...data.rows] : data.rows
      listaCompraStats.value = data.stats
      listaCompraTotalItens.value = data.meta.total_itens
      listaCompraTotalPaginas.value = data.meta.total_paginas
      if (data.parametros) compraParametros.value = data.parametros
      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao montar a lista de compra.')
      return null
    }
    finally {
      loadingListaCompra.value = false
    }
  }

  const reset = () => {
    produtos.value = []
    runs.value = []
    latestRun.value = null
    stats.value = defaultStats()
    aiDashboard.value = null
    lastSyncResult.value = null
    page.value = 1
    pageSize.value = 50
    totalItens.value = 0
    totalPaginas.value = 1
    sort.value = 'score_valor'
    loadingProdutos.value = false
    loadingStatus.value = false
    loadingAiDashboard.value = false
    aiActionLoading.value = false
    syncing.value = false
    cancelling.value = false
    stopSyncPolling()
    stopAiTaskPolling()
    aiTaskRunning.value = false
    aiTaskProgressPercent.value = 0
    aiTaskProgressMessage.value = ''
    aiTaskProgressDetail.value = ''
    errorMessage.value = ''
    successMessage.value = ''
    coverage.value = null
    health.value = null
    schedule.value = null
    compraParametros.value = null
    sazonalidade.value = null
    sazonalidadeAno.value = null
    sazonalidadeMesInicio.value = 1
    listaCompra.value = []
    listaCompraStats.value = null
    listaCompraTotalItens.value = 0
    listaCompraTotalPaginas.value = 1
    loadingListaCompra.value = false
    produtoSelecionado.value = null
  }

  return {
    produtoSelecionado,
    produtoModalAberto,
    produtos,
    runs,
    latestRun,
    stats,
    aiDashboard,
    lastSyncResult,
    coverage,
    health,
    schedule,
    compraParametros,
    sazonalidade,
    sazonalidadeAno,
    sazonalidadeMesInicio,
    listaCompra,
    listaCompraStats,
    listaCompraTotalItens,
    listaCompraTotalPaginas,
    loadingListaCompra,
    loadingHealth,
    loadingSchedule,
    loadingInsights,
    savingConfig,
    page,
    pageSize,
    totalItens,
    totalPaginas,
    sort,
    loadingProdutos,
    loadingStatus,
    loadingAiDashboard,
    aiActionLoading,
    syncing,
    cancelling,
    errorMessage,
    successMessage,
    syncProgress,
    syncProgressPercent,
    aiTaskRunning,
    aiTaskProgressPercent,
    aiTaskProgressMessage,
    aiTaskProgressDetail,
    clearMessages,
    fetchProdutos,
    fetchSyncStatus,
    resumeSyncTrackingIfRunning,
    syncNow,
    cancelSync,
    updateOportunidadeStatus,
    fetchAiDashboard,
    createAiTask,
    updateAiTask,
    runAiTask,
    fetchSyncHealth,
    fetchSyncSchedule,
    updateSyncSchedule,
    fetchCompraParametros,
    updateCompraParametros,
    fetchSazonalidade,
    fetchListaCompra,
    reset,
  }
})
