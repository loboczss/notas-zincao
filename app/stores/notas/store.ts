import { ref } from 'vue'
import { defineStore } from 'pinia'
import { $fetch } from 'ofetch'
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
}

export const useNotasStore = defineStore('notas', () => {
  const notas = ref<NotaRetiradaListItem[]>([])
  const notasRetirada = ref<NotaRetiradaDetalheItem[]>([])

  const loadingNotas = ref(false)
  const loadingRetirada = ref(false)
  const extractingNota = ref(false)
  const creatingNota = ref(false)
  const savingRetirada = ref(false)
  const errorMessage = ref('')

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
      }>('/api/notas/list', {
        query: {
          search: filters.search?.trim() || undefined,
          status: filters.status && filters.status !== 'todos' ? filters.status : undefined,
          data_inicio: filters.data_inicio?.trim() || undefined,
          data_fim: filters.data_fim?.trim() || undefined,
        },
      })

      notas.value = data.notas || []
      return notas.value
    }
    catch (error) {
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
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao salvar a nota.'
      return null
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
      return notasRetirada.value
    }
    catch (error) {
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
      const data = await $fetch(`/api/notas/${notaId}/retirada`, {
        method: 'PATCH',
        body: payload,
      })

      await fetchNotasRetirada()
      return data
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao registrar retirada.'
      return null
    }
    finally {
      savingRetirada.value = false
    }
  }

  const atualizarStatusNota = async (notaId: string, status: NotaRetiradaStatus, observacoes?: string) => {
    savingRetirada.value = true
    clearError()

    try {
      const data = await $fetch(`/api/notas/${notaId}/status`, {
        method: 'PATCH',
        body: {
          status_retirada: status,
          ...(observacoes ? { observacoes } : {}),
        },
      })

      await fetchNotasRetirada()
      return data
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao atualizar status da nota.'
      return null
    }
    finally {
      savingRetirada.value = false
    }
  }

  return {
    notas,
    notasRetirada,
    loadingNotas,
    loadingRetirada,
    extractingNota,
    creatingNota,
    savingRetirada,
    errorMessage,
    clearError,
    fetchNotas,
    fetchNotasRetirada,
    extractNota,
    createNota,
    registrarRetirada,
    atualizarStatusNota,
  }
})
