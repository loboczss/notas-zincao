
import { ref, computed } from 'vue'
import { useNotasStore } from '../stores'
import type { NotaRetiradaDraft, NotaMissingField } from '../../shared/types/NotasRetirada'
import { useToast } from './useToast'
import { getApiErrorMessage } from '../utils/api-errors'
import { getApiFetch } from '../utils/api-fetch'
import { normalizeNotaImageDataUrl } from '../utils/image-compression'

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
      const normalizedImageDataUrl = await normalizeNotaImageDataUrl(imageDataUrl)
      const data = await getApiFetch()<{
        draft: NotaRetiradaDraft
        missingFields: NotaMissingField[]
      }>('/api/openai/extract-nota', {
        method: 'POST',
        body: { imageDataUrl: normalizedImageDataUrl },
      })
      showSuccess('Imagem processada com sucesso!', 'IA')
      return data
    } catch (error) {
      const msg = getApiErrorMessage(error, 'Falha ao processar imagem.')
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
      await getApiFetch()('/api/notas/create', {
        method: 'POST',
        body: nota,
      })
      const msg = 'Nota cadastrada com sucesso!'
      lastSuccess.value = msg
      showSuccess(msg)
      return true
    } catch (error) {
      const msg = getApiErrorMessage(error, 'Falha ao salvar nota.')
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
