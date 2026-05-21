import { ref } from 'vue'
import { defineStore } from 'pinia'
import { $fetch } from 'ofetch'
import { useToast } from '../../composables/useToast'
import {
  enqueueOfflineRequest,
  getOfflineCache,
  getOnlineStatus,
  setOfflineCache,
} from '../../utils/offline-db'

import type {
  NotaExtractionResponse,
  NotaRetiradaDraft,
  NotaRegistrarRetiradaRequest,
  NotaRetiradaDetalheItem,
  NotaRetiradaListItem,
  NotaRetiradaStatus,
} from '../../../shared/types/NotasRetirada'

type NotasListFilters = {
  search?: string
  status?: 'todos' | NotaRetiradaStatus
  data_inicio?: string
  data_fim?: string
  page?: number
  page_size?: number
}

const NOTAS_CACHE_KEY = 'notas:list:last'
const NOTAS_RETIRADA_CACHE_KEY = 'notas:retirada:last'
const NOTAS_LIXEIRA_CACHE_KEY = 'notas:lixeira:last'

const createOfflineNota = (payload: NotaRetiradaDraft): NotaRetiradaListItem => ({
  id: `offline-nota-${Date.now()}`,
  contato_id: payload.contato_id || null,
  nome_cliente: payload.nome_cliente,
  numero_nota: payload.numero_nota,
  serie_nota: payload.serie_nota || '1',
  data_compra: payload.data_compra,
  data_retirada: null,
  valor_total: payload.valor_total ?? null,
  desconto_total: payload.desconto_total ?? null,
  status_retirada: payload.status_retirada || 'pendente',
  criado_em: new Date().toISOString(),
  produtos: payload.produtos,
  foto_url: payload.foto_url || null,
  foto_cliente_url: payload.foto_cliente_url || null,
  comprovante_retirada_url: null,
  _offlineStatus: 'pending_create',
} as NotaRetiradaListItem)

export const useNotasStore = defineStore('notas', () => {
  const notas = ref<NotaRetiradaListItem[]>([])
  const notasRetirada = ref<NotaRetiradaDetalheItem[]>([])
  const { success: showSuccess } = useToast()


  const loadingNotas = ref(false)
  const loadingRetirada = ref(false)
  const extractingNota = ref(false)
  const creatingNota = ref(false)
  const savingRetirada = ref(false)
  const errorMessage = ref('')
  const page = ref(1)
  const pageSize = ref(20)
  const totalNotas = ref(0)
  const totalPaginas = ref(1)

  const clearError = () => {
    errorMessage.value = ''
  }

  const fetchNotas = async (filters: NotasListFilters = {}) => {
    loadingNotas.value = true
    clearError()

    try {
      const data = await $fetch<{
        success: boolean
        notas: NotaRetiradaListItem[]
        pagination?: {
          page: number
          page_size: number
          total: number
          total_pages: number
        }
      }>('/api/notas/list', {
        query: {
          search: filters.search?.trim() || undefined,
          status: filters.status && filters.status !== 'todos' ? filters.status : undefined,
          data_inicio: filters.data_inicio?.trim() || undefined,
          data_fim: filters.data_fim?.trim() || undefined,
          page: filters.page || page.value,
          page_size: filters.page_size || pageSize.value,
        },
      })

      notas.value = data.notas || []
      page.value = data.pagination?.page || 1
      pageSize.value = data.pagination?.page_size || (filters.page_size || pageSize.value)
      totalNotas.value = data.pagination?.total || notas.value.length
      totalPaginas.value = data.pagination?.total_pages || 1
      await setOfflineCache(NOTAS_CACHE_KEY, {
        notas: notas.value,
        page: page.value,
        pageSize: pageSize.value,
        totalNotas: totalNotas.value,
        totalPaginas: totalPaginas.value,
      })
      return notas.value
    }
    catch (error) {
      const cached = await getOfflineCache<{
        notas: NotaRetiradaListItem[]
        page: number
        pageSize: number
        totalNotas: number
        totalPaginas: number
      }>(NOTAS_CACHE_KEY)

      if (cached) {
        notas.value = cached.notas
        page.value = cached.page
        pageSize.value = cached.pageSize
        totalNotas.value = cached.totalNotas
        totalPaginas.value = cached.totalPaginas
        errorMessage.value = 'Modo offline: exibindo as ultimas notas salvas no aparelho.'
        return notas.value
      }

      errorMessage.value = error instanceof Error ? error.message : 'Falha ao carregar notas.'
      return []
    }
    finally {
      loadingNotas.value = false
    }
  }

  const extractNota = async (imageDataUrl: string) => {
    extractingNota.value = true
    clearError()

    try {
      const data = await $fetch<NotaExtractionResponse>('/api/openai/extract-nota', {
        method: 'POST',
        body: { imageDataUrl },
      })

      return data
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao analisar a imagem da nota.'
      return null
    }
    finally {
      extractingNota.value = false
    }
  }

  const createNota = async (payload: NotaRetiradaDraft) => {
    creatingNota.value = true
    clearError()

    try {
      if (!getOnlineStatus()) {
        const offlineNota = createOfflineNota(payload)
        notas.value = [offlineNota, ...notas.value]
        totalNotas.value += 1
        await setOfflineCache(NOTAS_CACHE_KEY, {
          notas: notas.value,
          page: page.value,
          pageSize: pageSize.value,
          totalNotas: totalNotas.value,
          totalPaginas: totalPaginas.value,
        })
        await enqueueOfflineRequest({
          endpoint: '/api/notas/create',
          method: 'POST',
          body: payload,
          entity: 'notas',
          description: `Criar nota ${payload.numero_nota}`,
        })
        showSuccess('Nota salva offline. Ela sera sincronizada quando a internet voltar.')
        return { success: true, nota: offlineNota }
      }

      const data = await $fetch<{
        success: boolean
        nota: {
          id: string
          nome_cliente: string
          numero_nota: string
          serie_nota: string
          status_retirada: NotaRetiradaStatus
        }
      }>('/api/notas/create', {
        method: 'POST',
        body: payload,
      })

      await fetchNotas()
      return data
    }
    catch (error) {
      const offlineNota = createOfflineNota(payload)
      notas.value = [offlineNota, ...notas.value]
      totalNotas.value += 1
      await setOfflineCache(NOTAS_CACHE_KEY, {
        notas: notas.value,
        page: page.value,
        pageSize: pageSize.value,
        totalNotas: totalNotas.value,
        totalPaginas: totalPaginas.value,
      })
      await enqueueOfflineRequest({
        endpoint: '/api/notas/create',
        method: 'POST',
        body: payload,
        entity: 'notas',
        description: `Criar nota ${payload.numero_nota}`,
      })
      errorMessage.value = 'Sem conexao: a nota foi salva offline para sincronizar depois.'
      showSuccess('Nota salva offline. Ela sera sincronizada quando a internet voltar.')
      return { success: true, nota: offlineNota }
    }
    finally {
      creatingNota.value = false
    }
  }

  const fetchNotasRetirada = async (filters: NotasListFilters = {}) => {
    loadingRetirada.value = true
    clearError()

    try {
      const data = await $fetch<{
        success: boolean
        notas: NotaRetiradaDetalheItem[]
      }>('/api/notas/retirada-list', {
        query: {
          search: filters.search?.trim() || undefined,
          status: filters.status && filters.status !== 'todos' ? filters.status : undefined,
          data_inicio: filters.data_inicio?.trim() || undefined,
          data_fim: filters.data_fim?.trim() || undefined,
        },
      })

      notasRetirada.value = data.notas || []
      await setOfflineCache(NOTAS_RETIRADA_CACHE_KEY, notasRetirada.value)
      return notasRetirada.value
    }
    catch (error) {
      const cached = await getOfflineCache<NotaRetiradaDetalheItem[]>(NOTAS_RETIRADA_CACHE_KEY)
      if (cached) {
        notasRetirada.value = cached
        errorMessage.value = 'Modo offline: exibindo retiradas salvas no aparelho.'
        return notasRetirada.value
      }

      errorMessage.value = error instanceof Error ? error.message : 'Falha ao carregar notas para retirada.'
      return []
    }
    finally {
      loadingRetirada.value = false
    }
  }

  const registrarRetirada = async (notaId: string, payload: NotaRegistrarRetiradaRequest) => {
    savingRetirada.value = true
    clearError()

    try {
      if (!getOnlineStatus()) {
        await enqueueOfflineRequest({
          endpoint: `/api/notas/${notaId}/retirada`,
          method: 'PATCH',
          body: payload,
          entity: 'notas',
          description: `Registrar retirada da nota ${notaId}`,
        })
        showSuccess('Retirada salva offline. Ela sera sincronizada quando a internet voltar.')
        return { success: true, offline: true }
      }

      const data = await $fetch(`/api/notas/${notaId}/retirada`, {
        method: 'PATCH',
        body: payload,
      })

      await fetchNotasRetirada()
      showSuccess('Retirada registrada com sucesso!')
      return data
    }
    catch (error) {
      await enqueueOfflineRequest({
        endpoint: `/api/notas/${notaId}/retirada`,
        method: 'PATCH',
        body: payload,
        entity: 'notas',
        description: `Registrar retirada da nota ${notaId}`,
      })
      const msg = 'Sem conexao: retirada salva offline para sincronizar depois.'
      errorMessage.value = msg
      showSuccess(msg)
      return { success: true, offline: true }
    }

    finally {
      savingRetirada.value = false
    }
  }

  const atualizarStatusNota = async (notaId: string, status: NotaRetiradaStatus, observacoes?: string) => {
    savingRetirada.value = true
    clearError()

    try {
      if (!getOnlineStatus()) {
        await enqueueOfflineRequest({
          endpoint: `/api/notas/${notaId}/status`,
          method: 'PATCH',
          body: {
            status_retirada: status,
            ...(observacoes ? { observacoes } : {}),
          },
          entity: 'notas',
          description: `Atualizar status da nota ${notaId}`,
        })
        notas.value = notas.value.map(n => n.id === notaId ? { ...n, status_retirada: status } : n)
        await setOfflineCache(NOTAS_CACHE_KEY, {
          notas: notas.value,
          page: page.value,
          pageSize: pageSize.value,
          totalNotas: totalNotas.value,
          totalPaginas: totalPaginas.value,
        })
        showSuccess('Status salvo offline. Ele sera sincronizado quando a internet voltar.')
        return { success: true, offline: true }
      }

      const data = await $fetch(`/api/notas/${notaId}/status`, {
        method: 'PATCH',
        body: {
          status_retirada: status,
          ...(observacoes ? { observacoes } : {}),
        },
      })

      await fetchNotasRetirada()
      showSuccess('Status da nota atualizado com sucesso!')
      return data
    }
    catch (error) {
      await enqueueOfflineRequest({
        endpoint: `/api/notas/${notaId}/status`,
        method: 'PATCH',
        body: {
          status_retirada: status,
          ...(observacoes ? { observacoes } : {}),
        },
        entity: 'notas',
        description: `Atualizar status da nota ${notaId}`,
      })
      notas.value = notas.value.map(n => n.id === notaId ? { ...n, status_retirada: status } : n)
      await setOfflineCache(NOTAS_CACHE_KEY, {
        notas: notas.value,
        page: page.value,
        pageSize: pageSize.value,
        totalNotas: totalNotas.value,
        totalPaginas: totalPaginas.value,
      })
      const msg = 'Sem conexao: status salvo offline para sincronizar depois.'
      errorMessage.value = msg
      showSuccess(msg)
      return { success: true, offline: true }
    }

    finally {
      savingRetirada.value = false
    }
  }

  const loadingLixeira = ref(false)
  const loadingHistorico = ref(false)
  const lixeira = ref<NotaRetiradaListItem[]>([])
  const historicoAtual = ref<any[]>([])

  const fetchLixeira = async () => {
    loadingLixeira.value = true
    clearError()

    try {
      const data = await $fetch<{
        success: boolean
        notas: NotaRetiradaListItem[]
      }>('/api/notas/lixeira')

      lixeira.value = data.notas || []
      await setOfflineCache(NOTAS_LIXEIRA_CACHE_KEY, lixeira.value)
      return lixeira.value
    }
    catch (error) {
      const cached = await getOfflineCache<NotaRetiradaListItem[]>(NOTAS_LIXEIRA_CACHE_KEY)
      if (cached) {
        lixeira.value = cached
        errorMessage.value = 'Modo offline: exibindo lixeira salva no aparelho.'
        return lixeira.value
      }

      errorMessage.value = error instanceof Error ? error.message : 'Falha ao carregar a lixeira.'
      return []
    }
    finally {
      loadingLixeira.value = false
    }
  }

  const fetchHistorico = async (notaId: string) => {
    loadingHistorico.value = true
    clearError()

    try {
      const data = await $fetch<{
        success: boolean
        historico: any[]
      }>(`/api/notas/${notaId}/historico`)

      historicoAtual.value = data.historico || []
      return historicoAtual.value
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao carregar o histórico da nota.'
      return []
    }
    finally {
      loadingHistorico.value = false
    }
  }

  const deleteNota = async (notaId: string) => {
    clearError()

    try {
      if (!getOnlineStatus()) {
        await enqueueOfflineRequest({
          endpoint: `/api/notas/${notaId}/delete`,
          method: 'DELETE',
          entity: 'notas',
          description: `Excluir nota ${notaId}`,
        })
        notas.value = notas.value.filter(n => n.id !== notaId)
        await setOfflineCache(NOTAS_CACHE_KEY, {
          notas: notas.value,
          page: page.value,
          pageSize: pageSize.value,
          totalNotas: Math.max(0, totalNotas.value - 1),
          totalPaginas: totalPaginas.value,
        })
        showSuccess('Exclusao salva offline. Ela sera sincronizada quando a internet voltar.')
        return true
      }

      const data = await $fetch<{ success: boolean }>(`/api/notas/${notaId}/delete`, {
        method: 'DELETE',
      })
      
      // Remove from current list after soft delete
      notas.value = notas.value.filter(n => n.id !== notaId)
      showSuccess('Nota excluída com sucesso!')
      return data.success
    }
    catch (error) {
      await enqueueOfflineRequest({
        endpoint: `/api/notas/${notaId}/delete`,
        method: 'DELETE',
        entity: 'notas',
        description: `Excluir nota ${notaId}`,
      })
      notas.value = notas.value.filter(n => n.id !== notaId)
      await setOfflineCache(NOTAS_CACHE_KEY, {
        notas: notas.value,
        page: page.value,
        pageSize: pageSize.value,
        totalNotas: Math.max(0, totalNotas.value - 1),
        totalPaginas: totalPaginas.value,
      })
      const msg = 'Sem conexao: exclusao salva offline para sincronizar depois.'
      errorMessage.value = msg
      showSuccess(msg)
      return true
    }
  }


  return {
    notas,
    notasRetirada,
    lixeira,
    historicoAtual,
    loadingNotas,
    loadingRetirada,
    loadingLixeira,
    loadingHistorico,
    extractingNota,
    creatingNota,
    savingRetirada,
    page,
    pageSize,
    totalNotas,
    totalPaginas,
    errorMessage,
    clearError,
    fetchNotas,
    fetchNotasRetirada,
    fetchLixeira,
    fetchHistorico,
    extractNota,
    createNota,
    registrarRetirada,
    atualizarStatusNota,
    deleteNota,
  }
})
