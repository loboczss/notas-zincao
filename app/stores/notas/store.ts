import { ref } from 'vue'
import { defineStore } from 'pinia'
import { $fetch } from 'ofetch'
import type {
  NotaRegistrarRetiradaRequest,
  NotaRetiradaDetalheItem,
  NotaRetiradaListItem,
  NotaRetiradaStatus,
} from '../../../shared/types/NotasRetirada'

export const useNotasStore = defineStore('notas', () => {
  const notas = ref<NotaRetiradaListItem[]>([])
  const notasRetirada = ref<NotaRetiradaDetalheItem[]>([])

  const loadingNotas = ref(false)
  const loadingRetirada = ref(false)
  const savingRetirada = ref(false)
  const errorMessage = ref('')

  const clearError = () => {
    errorMessage.value = ''
  }

  const fetchNotas = async () => {
    loadingNotas.value = true
    clearError()

    try {
      const data = await $fetch<{
        success: boolean
        notas: NotaRetiradaListItem[]
      }>('/api/notas/list')

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

  const fetchNotasRetirada = async () => {
    loadingRetirada.value = true
    clearError()

    try {
      const data = await $fetch<{
        success: boolean
        notas: NotaRetiradaDetalheItem[]
      }>('/api/notas/retirada-list')

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
    savingRetirada,
    errorMessage,
    clearError,
    fetchNotas,
    fetchNotasRetirada,
    registrarRetirada,
    atualizarStatusNota,
  }
})
