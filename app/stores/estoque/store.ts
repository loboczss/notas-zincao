import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getApiErrorMessage } from '../../utils/api-errors'
import { getApiFetch } from '../../utils/api-fetch'
import {
  enqueueOfflineRequest,
  getOfflineCache,
  getOnlineStatus,
  setOfflineCache,
} from '../../utils/offline-db'
import type {
  EstoqueDetailResponse,
  EstoqueListQuery,
  EstoqueListResponse,
  EstoqueProduto,
  EstoqueProdutoDraft,
  EstoqueSearchResponse,
  EstoqueSaveResponse,
} from '../../../shared/types/Estoque'

const ESTOQUE_CACHE_KEY = 'estoque:list:last'
const ESTOQUE_DETAIL_CACHE_PREFIX = 'estoque:detail:'

type FetchProdutosOptions = {
  append?: boolean
}

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const createOfflineProduto = (payload: EstoqueProdutoDraft): EstoqueProduto => ({
  id_produto: payload.id_produto || -Date.now(),
  descricao: payload.descricao,
  embalagem_saida: payload.embalagem_saida,
  valor_preco_varejo: payload.valor_preco_varejo || null,
  tipo_produto: payload.tipo_produto || null,
  quantidade_estoque: Number(payload.quantidade_estoque || 0),
  criado_em: new Date().toISOString(),
  atualizado_em: new Date().toISOString(),
  id_produto_pai: numberOrNull(payload.id_produto_pai),
  fator_conversao: numberOrNull(payload.fator_conversao),
  _offlineStatus: 'pending_create',
} as EstoqueProduto)

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

  const persistListCache = async () => {
    await setOfflineCache(ESTOQUE_CACHE_KEY, {
      produtos: produtos.value,
      page: page.value,
      pageSize: pageSize.value,
      totalItens: totalItens.value,
      totalPaginas: totalPaginas.value,
      quantidadeTotalEstoque: quantidadeTotalEstoque.value,
    })
  }

  const restoreListCache = async () => {
    const cached = await getOfflineCache<{
      produtos: EstoqueProduto[]
      page: number
      pageSize: number
      totalItens: number
      totalPaginas: number
      quantidadeTotalEstoque: number
    }>(ESTOQUE_CACHE_KEY)

    if (!cached) return false

    produtos.value = cached.produtos
    page.value = cached.page
    pageSize.value = cached.pageSize
    totalItens.value = cached.totalItens
    totalPaginas.value = cached.totalPaginas
    quantidadeTotalEstoque.value = cached.quantidadeTotalEstoque
    return true
  }

  const mergeProdutos = (current: EstoqueProduto[], incoming: EstoqueProduto[]) => {
    const byId = new Map<number, EstoqueProduto>()

    for (const produto of current) {
      byId.set(Number(produto.id_produto), produto)
    }

    for (const produto of incoming) {
      byId.set(Number(produto.id_produto), produto)
    }

    return [...byId.values()]
  }

  const getProdutoLocal = (idProduto: number) => {
    return produtos.value.find(produto => Number(produto.id_produto) === Number(idProduto)) || null
  }

  const selecionarProdutoLocal = (idProduto: number) => {
    const produto = getProdutoLocal(idProduto)
    if (produto) {
      produtoAtual.value = produto
    }

    return produto
  }

  const salvarProdutoLocal = async (produto: EstoqueProduto) => {
    const produtoAnterior = getProdutoLocal(produto.id_produto)
    const quantidadeAnterior = Number(produtoAnterior?.quantidade_estoque || 0)
    const quantidadeNova = Number(produto.quantidade_estoque || 0)

    produtos.value = produtoAnterior
      ? produtos.value.map(item => Number(item.id_produto) === Number(produto.id_produto) ? produto : item)
      : [produto, ...produtos.value]

    produtoAtual.value = produto
    if (!produtoAnterior) {
      totalItens.value += 1
    }

    quantidadeTotalEstoque.value += quantidadeNova - quantidadeAnterior
    await setOfflineCache(`${ESTOQUE_DETAIL_CACHE_PREFIX}${produto.id_produto}`, produto)
    await persistListCache()
  }

  const fetchProdutos = async (filters: EstoqueListQuery = {}, options: FetchProdutosOptions = {}) => {
    loadingProdutos.value = true
    clearError()

    try {
      const normalizedSearch = filters.search?.trim() || ''
      const endpoint = normalizedSearch ? '/api/estoque/search' : '/api/estoque/list'

      const data = await getApiFetch()<EstoqueListResponse | EstoqueSearchResponse>(endpoint, {
        query: {
          search: normalizedSearch || undefined,
          tipo_produto: filters.tipo_produto?.trim() || undefined,
          page: filters.page,
          page_size: filters.page_size ?? filters.limit,
        },
      })

      const incomingProdutos = data.produtos || []
      produtos.value = options.append
        ? mergeProdutos(produtos.value, incomingProdutos)
        : incomingProdutos
      page.value = data.meta?.page || 1
      pageSize.value = data.meta?.page_size || (filters.page_size ?? 30)
      totalItens.value = data.meta?.total_itens || produtos.value.length
      totalPaginas.value = data.meta?.total_paginas || 1
      quantidadeTotalEstoque.value = 'stats' in data
        ? Number(data.stats?.quantidade_total_estoque || 0)
        : produtos.value.reduce((acc, item) => acc + Number(item.quantidade_estoque || 0), 0)
      await persistListCache()
      return produtos.value
    }
    catch (error) {
      if (await restoreListCache()) {
        errorMessage.value = 'Modo offline: exibindo estoque salvo no aparelho.'
        return produtos.value
      }

      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar o estoque.')
      return []
    }
    finally {
      loadingProdutos.value = false
    }
  }

  const searchProdutos = async (search: string, filters: Omit<EstoqueListQuery, 'search'> = {}) => {
    clearError()
    const term = search.trim().toLowerCase()

    const localSearch = async () => {
      if (!produtos.value.length) await restoreListCache()
      return produtos.value
        .filter(produto => produto.descricao.toLowerCase().includes(term))
        .slice(0, filters.limit ?? 8)
    }

    if (!getOnlineStatus()) return localSearch()

    try {
      const data = await getApiFetch()<EstoqueSearchResponse>('/api/estoque/search', {
        query: {
          search: term || undefined,
          tipo_produto: filters.tipo_produto?.trim() || undefined,
          limit: filters.limit ?? 8,
        },
      })

      return data.produtos || []
    }
    catch (error) {
      const local = await localSearch()
      if (local.length) return local

      errorMessage.value = getApiErrorMessage(error, 'Falha ao buscar sugestoes de estoque.')
      return []
    }
  }

  const fetchProduto = async (idProduto: number) => {
    loadingProduto.value = true
    clearError()

    try {
      const data = await getApiFetch()<EstoqueDetailResponse>(`/api/estoque/${idProduto}`)
      produtoAtual.value = data.produto
      await setOfflineCache(`${ESTOQUE_DETAIL_CACHE_PREFIX}${idProduto}`, produtoAtual.value)
      return produtoAtual.value
    }
    catch (error) {
      const cached = await getOfflineCache<EstoqueProduto>(`${ESTOQUE_DETAIL_CACHE_PREFIX}${idProduto}`)
      if (cached) {
        produtoAtual.value = cached
        errorMessage.value = 'Modo offline: exibindo produto salvo no aparelho.'
        return produtoAtual.value
      }

      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar o produto do estoque.')
      return null
    }
    finally {
      loadingProduto.value = false
    }
  }

  const createProduto = async (payload: EstoqueProdutoDraft) => {
    savingProduto.value = true
    clearError()

    const queueCreate = async () => {
      const offlineProduto = createOfflineProduto(payload)
      produtos.value = [offlineProduto, ...produtos.value]
      produtoAtual.value = offlineProduto
      totalItens.value += 1
      quantidadeTotalEstoque.value += Number(offlineProduto.quantidade_estoque || 0)
      await persistListCache()
      await enqueueOfflineRequest({
        endpoint: '/api/estoque/create',
        method: 'POST',
        body: payload,
        entity: 'estoque',
        operation: 'create',
        entityId: String(offlineProduto.id_produto),
        clientId: String(offlineProduto.id_produto),
        description: `Criar produto ${payload.descricao}`,
      })
      return offlineProduto
    }

    try {
      if (!getOnlineStatus()) return await queueCreate()

      const data = await getApiFetch()<EstoqueSaveResponse>('/api/estoque/create', {
        method: 'POST',
        body: payload,
      })

      await salvarProdutoLocal(data.produto)
      return data.produto
    }
    catch {
      errorMessage.value = 'Sem conexao: produto salvo offline para sincronizar depois.'
      return await queueCreate()
    }
    finally {
      savingProduto.value = false
    }
  }

  const updateProduto = async (idProduto: number, payload: Partial<EstoqueProdutoDraft>) => {
    savingProduto.value = true
    clearError()

    const queueUpdate = async () => {
      await enqueueOfflineRequest({
        endpoint: `/api/estoque/${idProduto}`,
        method: 'PATCH',
        body: payload,
        entity: 'estoque',
        operation: 'update',
        entityId: String(idProduto),
        description: `Atualizar produto ${idProduto}`,
      })
      produtos.value = produtos.value.map(produto => produto.id_produto === idProduto
        ? { ...produto, ...payload, atualizado_em: new Date().toISOString(), _offlineStatus: 'pending_update' } as EstoqueProduto
        : produto)
      produtoAtual.value = produtos.value.find(produto => produto.id_produto === idProduto) || produtoAtual.value
      await persistListCache()
      return produtoAtual.value
    }

    try {
      if (!getOnlineStatus()) return await queueUpdate()

      const data = await getApiFetch()<EstoqueSaveResponse>(`/api/estoque/${idProduto}`, {
        method: 'PATCH',
        body: payload,
      })

      await salvarProdutoLocal(data.produto)
      return data.produto
    }
    catch {
      errorMessage.value = 'Sem conexao: produto salvo offline para sincronizar depois.'
      return await queueUpdate()
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

  const reset = () => {
    produtos.value = []
    produtoAtual.value = null
    page.value = 1
    pageSize.value = 30
    totalItens.value = 0
    totalPaginas.value = 1
    quantidadeTotalEstoque.value = 0
    loadingProdutos.value = false
    loadingProduto.value = false
    savingProduto.value = false
    errorMessage.value = ''
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
    getProdutoLocal,
    selecionarProdutoLocal,
    fetchProdutos,
    searchProdutos,
    fetchProduto,
    createProduto,
    updateProduto,
    saveProduto,
    reset,
  }
})
