import { ref } from 'vue'
import { defineStore } from 'pinia'
import { $fetch } from 'ofetch'
import type {
  EstoqueDetailResponse,
  EstoqueListQuery,
  EstoqueListResponse,
  EstoqueProduto,
  EstoqueProdutoDraft,
  EstoqueSearchResponse,
  EstoqueSaveResponse,
} from '../../../shared/types/Estoque'

export const useEstoqueStore = defineStore('estoque', () => {
  const produtos = ref<EstoqueProduto[]>([])
  const produtoAtual = ref<EstoqueProduto | null>(null)
  const page = ref(1)
  const pageSize = ref(30)
  const totalItens = ref(0)
  const totalPaginas = ref(1)
  const quantidadeTotalEstoque = ref(0)
  const loadingProdutos = ref(false)
  const loadingProduto = ref(false)
  const savingProduto = ref(false)
  const errorMessage = ref('')

  const clearError = () => {
    errorMessage.value = ''
  }

  const clearProdutoAtual = () => {
    produtoAtual.value = null
  }

  const fetchProdutos = async (filters: EstoqueListQuery = {}) => {
    loadingProdutos.value = true
    clearError()

    try {
      const normalizedSearch = filters.search?.trim() || ''
      const endpoint = normalizedSearch ? '/api/estoque/search' : '/api/estoque/list'

      const data = await $fetch<EstoqueListResponse | EstoqueSearchResponse>(endpoint, {
        query: {
          search: normalizedSearch || undefined,
          tipo_produto: filters.tipo_produto?.trim() || undefined,
          page: filters.page,
          page_size: filters.page_size ?? filters.limit,
        },
      })

      produtos.value = data.produtos || []
      page.value = data.meta?.page || 1
      pageSize.value = data.meta?.page_size || (filters.page_size ?? 30)
      totalItens.value = data.meta?.total_itens || 0
      totalPaginas.value = data.meta?.total_paginas || 1
      quantidadeTotalEstoque.value = 'stats' in data
        ? Number(data.stats?.quantidade_total_estoque || 0)
        : produtos.value.reduce((acc, item) => acc + Number(item.quantidade_estoque || 0), 0)
      return produtos.value
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao carregar o estoque.'
      return []
    }
    finally {
      loadingProdutos.value = false
    }
  }

  const searchProdutos = async (search: string, filters: Omit<EstoqueListQuery, 'search'> = {}) => {
    clearError()

    try {
      const data = await $fetch<EstoqueSearchResponse>('/api/estoque/search', {
        query: {
          search: search.trim() || undefined,
          tipo_produto: filters.tipo_produto?.trim() || undefined,
          limit: filters.limit ?? 8,
        },
      })

      return data.produtos || []
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao buscar sugestões de estoque.'
      return []
    }
  }

  const fetchProduto = async (idProduto: number) => {
    loadingProduto.value = true
    clearError()

    try {
      const data = await $fetch<EstoqueDetailResponse>(`/api/estoque/${idProduto}`)
      produtoAtual.value = data.produto
      return produtoAtual.value
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao carregar o produto do estoque.'
      return null
    }
    finally {
      loadingProduto.value = false
    }
  }

  const createProduto = async (payload: EstoqueProdutoDraft) => {
    savingProduto.value = true
    clearError()

    try {
      const data = await $fetch<EstoqueSaveResponse>('/api/estoque/create', {
        method: 'POST',
        body: payload,
      })

      produtoAtual.value = data.produto
      await fetchProdutos()
      return data.produto
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao criar produto no estoque.'
      return null
    }
    finally {
      savingProduto.value = false
    }
  }

  const updateProduto = async (idProduto: number, payload: Partial<EstoqueProdutoDraft>) => {
    savingProduto.value = true
    clearError()

    try {
      const data = await $fetch<EstoqueSaveResponse>(`/api/estoque/${idProduto}`, {
        method: 'PATCH',
        body: payload,
      })

      produtoAtual.value = data.produto
      await fetchProdutos()
      return data.produto
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao atualizar produto do estoque.'
      return null
    }
    finally {
      savingProduto.value = false
    }
  }

  const saveProduto = async (payload: EstoqueProdutoDraft) => {
    if (payload.id_produto) {
      return updateProduto(payload.id_produto, payload)
    }

    return createProduto(payload)
  }

  return {
    produtos,
    produtoAtual,
    page,
    pageSize,
    totalItens,
    totalPaginas,
    quantidadeTotalEstoque,
    loadingProdutos,
    loadingProduto,
    savingProduto,
    errorMessage,
    clearError,
    clearProdutoAtual,
    fetchProdutos,
    searchProdutos,
    fetchProduto,
    createProduto,
    updateProduto,
    saveProduto,
  }
})
