
import { useNotasStore } from '../stores'
import type { NotaRetiradaDraft, NotaMissingField } from '../../shared/types/NotasRetirada'

export const useNoteManagement = () => {
  const notasStore = useNotasStore()
  
  const loadingIA = ref(false)
  const lastError = ref('')
  const lastSuccess = ref('')

  const clearMessages = () => {
    lastError.value = ''
    lastSuccess.value = ''
  }

  const extractNotaFromImage = async (imageDataUrl: string) => {
    loadingIA.value = true
    clearMessages()
    
    try {
      const data = await $fetch<{
        draft: NotaRetiradaDraft
        missingFields: NotaMissingField[]
      }>('/api/openai/extract-nota', {
        method: 'POST',
        body: { imageDataUrl },
      })
      return data
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Falha ao processar imagem.'
      return null
    } finally {
      loadingIA.value = false
    }
  }

  const saveNota = async (nota: NotaRetiradaDraft) => {
    clearMessages()
    try {
      await $fetch('/api/notas/create', {
        method: 'POST',
        body: nota,
      })
      lastSuccess.value = 'Nota cadastrada com sucesso!'
      return true
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Falha ao salvar nota.'
      return false
    }
  }

  return {
    loadingIA,
    lastError,
    lastSuccess,
    clearMessages,
    extractNotaFromImage,
    saveNota,
    // Re-expose store state/methods for convenience
    loadingNotas: computed(() => notasStore.loadingNotas),
    loadingRetirada: computed(() => notasStore.loadingRetirada),
    savingRetirada: computed(() => notasStore.savingRetirada),
    fetchNotas: notasStore.fetchNotas,
    fetchNotasRetirada: notasStore.fetchNotasRetirada,
    registrarRetirada: notasStore.registrarRetirada,
    atualizarStatusNota: notasStore.atualizarStatusNota,
  }
}
