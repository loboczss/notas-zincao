import { computed, ref } from 'vue'
import type {
  RetiradaHistoricoEvento,
  RetiradaHistoricoFiltros,
  RetiradaHistoricoResumo,
  RetiradaHistoricoSortKey,
  RetiradaHistoricoSortOption,
  RetiradaHistoricoSortOrder,
} from '../../shared/types/RetiradasHistorico'
import { getApiErrorMessage } from '../utils/api-errors'
import { getApiFetch } from '../utils/api-fetch'
import { useToast } from './useToast'

const sortOptions: RetiradaHistoricoSortOption[] = [
  { key: 'data', label: 'Data', description: 'momento da retirada' },
  { key: 'nome_cliente', label: 'Cliente', description: 'nome do cliente' },
  { key: 'itens', label: 'Itens', description: 'quantidade de produtos' },
  { key: 'quantidade_total', label: 'Qtd.', description: 'quantidade total retirada' },
  { key: 'reducao_zinco_10', label: 'Zinco', description: 'baixa estimada no Zinco' },
]

type CarregarHistoricoOptions = {
  page?: number
  append?: boolean
}

const emptyResumo = (): RetiradaHistoricoResumo => ({
  eventos: 0,
  itens: 0,
  quantidade_total: 0,
  reducao_zinco_10: 0,
})

export const useRetiradasHistorico = () => {
  const apiFetch = getApiFetch()
  const { error: showError } = useToast()
  const historico = ref<RetiradaHistoricoEvento[]>([])
  const resumo = ref<RetiradaHistoricoResumo>(emptyResumo())
  const loading = ref(false)
  const errorMessage = ref('')
  const currentPage = ref(1)
  const pageSize = ref(12)
  const totalHistorico = ref(0)
  const totalPages = ref(1)
  const sortKey = ref<RetiradaHistoricoSortKey>('data')
  const sortOrder = ref<RetiradaHistoricoSortOrder>('desc')
  const filtros = ref<RetiradaHistoricoFiltros>({
    search: '',
    data_inicio: '',
    data_fim: '',
    hora_inicio: '',
    hora_fim: '',
  })

  const historicoInicio = computed(() => {
    if (!totalHistorico.value) return 0
    return 1
  })

  const historicoFim = computed(() => {
    if (!totalHistorico.value) return 0
    return Math.min(historico.value.length, totalHistorico.value)
  })

  const hasMoreHistorico = computed(() => {
    return historico.value.length < totalHistorico.value && currentPage.value < totalPages.value
  })

  const sortDescription = computed(() => {
    const option = sortOptions.find(item => item.key === sortKey.value)
    const direction = sortOrder.value === 'asc' ? 'crescente' : 'decrescente'
    return `${option?.description || 'ordem atual'} em ordem ${direction}`
  })

  const hasActiveFilters = computed(() => {
    return Boolean(
      filtros.value.search
      || filtros.value.data_inicio
      || filtros.value.data_fim
      || filtros.value.hora_inicio
      || filtros.value.hora_fim,
    )
  })

  const mergeHistorico = (current: RetiradaHistoricoEvento[], incoming: RetiradaHistoricoEvento[]) => {
    const byKey = new Map<string, RetiradaHistoricoEvento>()

    for (const evento of current) {
      byKey.set(`${evento.id_nota}-${evento.data}`, evento)
    }

    for (const evento of incoming) {
      byKey.set(`${evento.id_nota}-${evento.data}`, evento)
    }

    return [...byKey.values()]
  }

  const carregarHistorico = async (options: CarregarHistoricoOptions = {}) => {
    if (loading.value) return

    loading.value = true
    errorMessage.value = ''
    const pageToLoad = options.page || 1

    try {
      const response = await apiFetch<{
        success: boolean
        historico: RetiradaHistoricoEvento[]
        pagination?: {
          page: number
          page_size: number
          total: number
          total_pages: number
        }
        resumo?: RetiradaHistoricoResumo
      }>('/api/dashboard/retiradas-historico', {
        query: {
          page: pageToLoad,
          page_size: pageSize.value,
          sort_key: sortKey.value,
          sort_order: sortOrder.value,
          search: filtros.value.search,
          data_inicio: filtros.value.data_inicio,
          data_fim: filtros.value.data_fim,
          hora_inicio: filtros.value.hora_inicio,
          hora_fim: filtros.value.hora_fim,
        },
      })

      const incomingHistorico = response.historico || []
      historico.value = options.append
        ? mergeHistorico(historico.value, incomingHistorico)
        : incomingHistorico
      totalHistorico.value = Number(response.pagination?.total || 0)
      totalPages.value = Number(response.pagination?.total_pages || 1)
      currentPage.value = Number(response.pagination?.page || 1)
      resumo.value = response.resumo || emptyResumo()
    }
    catch (error) {
      console.error('[retiradas/historico]', error)
      if (!options.append) {
        historico.value = []
        resumo.value = emptyResumo()
        totalHistorico.value = 0
        totalPages.value = 1
      }
      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar o historico de retiradas.')
      showError(errorMessage.value)
    }
    finally {
      loading.value = false
    }
  }

  const toggleSort = async (key: RetiradaHistoricoSortKey) => {
    if (sortKey.value === key) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    }
    else {
      sortKey.value = key
      sortOrder.value = key === 'nome_cliente' ? 'asc' : 'desc'
    }

    currentPage.value = 1
    await carregarHistorico({ page: 1 })
  }

  const aplicarFiltros = async () => {
    currentPage.value = 1
    await carregarHistorico({ page: 1 })
  }

  const limparFiltros = async () => {
    filtros.value = {
      search: '',
      data_inicio: '',
      data_fim: '',
      hora_inicio: '',
      hora_fim: '',
    }
    currentPage.value = 1
    await carregarHistorico({ page: 1 })
  }

  const aplicarOrdenacao = async (
    key: RetiradaHistoricoSortKey,
    order: RetiradaHistoricoSortOrder,
  ) => {
    sortKey.value = key
    sortOrder.value = order
    currentPage.value = 1
    await carregarHistorico({ page: 1 })
  }

  const carregarMaisHistorico = async () => {
    if (!hasMoreHistorico.value || loading.value) return
    await carregarHistorico({
      page: currentPage.value + 1,
      append: true,
    })
  }

  return {
    historico,
    resumo,
    loading,
    errorMessage,
    currentPage,
    pageSize,
    totalHistorico,
    totalPages,
    sortKey,
    sortOrder,
    sortOptions,
    sortDescription,
    filtros,
    hasActiveFilters,
    historicoInicio,
    historicoFim,
    hasMoreHistorico,
    carregarHistorico,
    aplicarFiltros,
    limparFiltros,
    aplicarOrdenacao,
    toggleSort,
    carregarMaisHistorico,
  }
}
