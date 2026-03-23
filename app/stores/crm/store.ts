import { ref } from 'vue'
import { defineStore } from 'pinia'
import { $fetch } from 'ofetch'
import type {
  CrmContato,
  CrmContatoListResponse,
  CrmContatoUpsertRequest,
  CrmContatoUpsertResponse,
} from '../../../shared/types/CRM'

export const useCrmStore = defineStore('crm', () => {
  const contatos = ref<CrmContato[]>([])
  const loadingContatos = ref(false)
  const savingContato = ref(false)
  const errorMessage = ref('')

  const clearError = () => {
    errorMessage.value = ''
  }

  const clearContatos = () => {
    contatos.value = []
  }

  const fetchContatos = async (search = '') => {
    loadingContatos.value = true
    clearError()

    try {
      const data = await $fetch<CrmContatoListResponse>('/api/crm/list', {
        query: {
          search: search.trim() || undefined,
        },
      })

      contatos.value = data.contatos || []
      return contatos.value
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao carregar contatos do CRM.'
      return []
    }
    finally {
      loadingContatos.value = false
    }
  }

  const upsertContato = async (payload: CrmContatoUpsertRequest) => {
    savingContato.value = true
    clearError()

    try {
      const data = await $fetch<CrmContatoUpsertResponse>('/api/crm/upsert', {
        method: 'POST',
        body: payload,
      })

      const contato = data.contato
      const index = contatos.value.findIndex(item => item.contato_id === contato.contato_id)

      if (index >= 0) {
        contatos.value[index] = contato
      }
      else {
        contatos.value.unshift(contato)
      }

      return contato
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao salvar contato no CRM.'
      return null
    }
    finally {
      savingContato.value = false
    }
  }

  return {
    contatos,
    loadingContatos,
    savingContato,
    errorMessage,
    clearError,
    clearContatos,
    fetchContatos,
    upsertContato,
  }
})
