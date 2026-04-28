
import { ref, computed } from 'vue'
import { useNotasStore } from '../stores'
import type { NotaRetiradaDraft, NotaMissingField } from '../../shared/types/NotasRetirada'
import { useToast } from './useToast'

export const useNoteManagement = () => {
  const notasStore = useNotasStore()
  const { success: showSuccess, error: showError } = useToast()
  
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
      showSuccess('Imagem processada com sucesso!', 'IA')
      return data
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao processar imagem.'
      lastError.value = msg
      showError(msg, 'Erro na IA')
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
      const msg = 'Nota cadastrada com sucesso!'
      lastSuccess.value = msg
      showSuccess(msg)
      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao salvar nota.'
      lastError.value = msg
      showError(msg)
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
