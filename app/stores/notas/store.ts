import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useToast } from '../../composables/useToast'
import { getApiErrorMessage, getApiErrorStatus, isNetworkFetchError } from '../../utils/api-errors'
import { getApiFetch } from '../../utils/api-fetch'
import {
  enqueueOfflineRequest,
  getOfflineCache,
  getOfflineQueue,
  getOnlineStatus,
  setOfflineCache,
} from '../../utils/offline-db'
import {
  NOTAS_CACHE_KEY,
  NOTAS_DETAIL_CACHE_PREFIX,
  NOTAS_HISTORICO_CACHE_PREFIX,
  NOTAS_LIXEIRA_CACHE_KEY,
  NOTAS_RETIRADA_CACHE_KEY,
} from '../../utils/offline-cache-keys'
import {
  hydrateNotaOfflineMediaFromCache,
  preserveNotaOfflineMediaDataUrls,
  queryOfflineNotasLocal,
} from '../../utils/offline-notas-sync'

import type {
  NotaExtractionResponse,
  NotaRetiradaDraft,
  NotaRetiradaHistoricoItem,
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

type FetchNotasOptions = {
  append?: boolean
}

const createOfflineNotaId = () => `offline-nota-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`

const createOfflineNota = (payload: NotaRetiradaDraft, id = createOfflineNotaId()): NotaRetiradaListItem => ({
  id,
  contato_id: payload.contato_id || null,
  nome_cliente: payload.nome_cliente,
  numero_nota: payload.numero_nota,
  serie_nota: payload.serie_nota || '1',
  chave_nfe: payload.chave_nfe || null,
  data_compra: payload.data_compra,
  data_retirada: null,
  valor_total: payload.valor_total ?? null,
  desconto_total: payload.desconto_total ?? null,
  status_retirada: payload.status_retirada || 'pendente',
  criado_em: new Date().toISOString(),
  produtos: payload.produtos,
  foto_url: payload.foto_url || payload.foto_cupom_data_url || null,
  foto_cliente_url: payload.foto_cliente_url || payload.foto_cliente_data_url || null,
  comprovante_retirada_url: null,
  _offlineStatus: 'pending_create',
} as NotaRetiradaListItem)

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const normalizeSearchText = (value: unknown) => {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const isInsideDateRange = (value: string | undefined, start?: string, end?: string) => {
  const date = String(value || '').slice(0, 10)
  if (!date) return false
  if (start && date < start) return false
  if (end && date > end) return false
  return true
}

const filterLocalNotas = (items: NotaRetiradaListItem[], filters: NotasListFilters) => {
  const search = normalizeSearchText(filters.search)
  const status = filters.status && filters.status !== 'todos' ? filters.status : null
  const dataInicio = String(filters.data_inicio || '').trim()
  const dataFim = String(filters.data_fim || '').trim()

  return items.filter((nota) => {
    if (status && nota.status_retirada !== status) return false
    if ((dataInicio || dataFim) && !isInsideDateRange(nota.data_compra, dataInicio, dataFim)) return false

    if (!search) return true

    const produtos = Array.isArray(nota.produtos)
      ? nota.produtos.map(produto => produto.nome).join(' ')
      : ''
    const searchable = normalizeSearchText([
      nota.nome_cliente,
      nota.numero_nota,
      nota.serie_nota,
      nota.cadastrado_por_nome,
      produtos,
    ].join(' '))

    return searchable.includes(search)
  })
}

const paginateLocalNotas = (
  items: NotaRetiradaListItem[],
  requestedPage: number,
  requestedPageSize: number,
) => {
  const size = Math.max(1, requestedPageSize)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / size))
  const safePage = Math.min(Math.max(1, requestedPage), totalPages)
  const start = (safePage - 1) * size

  return {
    page: safePage,
    pageSize: size,
    total,
    totalPages,
    items: items.slice(start, start + size),
  }
}

const toDetalheNota = (nota: NotaRetiradaListItem | NotaRetiradaDetalheItem): NotaRetiradaDetalheItem => ({
  ...nota,
  contato_id: nota.contato_id ?? null,
  produtos: Array.isArray(nota.produtos) ? nota.produtos : [],
  historico_retiradas: Array.isArray((nota as NotaRetiradaDetalheItem).historico_retiradas)
    ? (nota as NotaRetiradaDetalheItem).historico_retiradas
    : [],
  criado_em: nota.criado_em,
})

const getStatusFromProdutos = (produtos: NotaRetiradaDetalheItem['produtos']): NotaRetiradaStatus => {
  if (!produtos.length) return 'pendente'

  const itensRetirados = produtos.filter(item => toNumber(item.quantidade_retirada) > 0).length
  const itensCompletos = produtos.filter(item => toNumber(item.quantidade_retirada) >= Math.max(1, toNumber(item.quantidade))).length

  if (itensCompletos === produtos.length) return 'retirada'
  if (itensRetirados > 0) return 'parcial'
  return 'pendente'
}

export const useNotasStore = defineStore('notas', () => {
  const notas = ref<NotaRetiradaListItem[]>([])
  const notasRetirada = ref<NotaRetiradaDetalheItem[]>([])
  const notaDetalheAtual = ref<NotaRetiradaDetalheItem | null>(null)
  const { success: showSuccess, error: showError } = useToast()


  const loadingNotas = ref(false)
  const loadingRetirada = ref(false)
  const extractingNota = ref(false)
  const creatingNota = ref(false)
  const savingRetirada = ref(false)
  const errorMessage = ref('')
  const page = ref(1)
  const pageSize = ref(20)
  let activeFetchId = 0
  const totalNotas = ref(0)
  const totalPaginas = ref(1)

  const clearError = () => {
    errorMessage.value = ''
  }

  const persistNotasCache = async () => {
    await setOfflineCache(NOTAS_CACHE_KEY, {
      notas: notas.value,
      page: page.value,
      pageSize: pageSize.value,
      totalNotas: totalNotas.value,
      totalPaginas: totalPaginas.value,
    })
  }

  const persistRetiradaCache = async () => {
    await setOfflineCache(NOTAS_RETIRADA_CACHE_KEY, notasRetirada.value)
  }

  const prepareNotaForOfflineCache = async (nota: NotaRetiradaListItem | NotaRetiradaDetalheItem) => {
    const detalhe = toDetalheNota(nota)
    const cached = await getOfflineCache<NotaRetiradaDetalheItem>(`${NOTAS_DETAIL_CACHE_PREFIX}${detalhe.id}`)
    const preserved = preserveNotaOfflineMediaDataUrls(detalhe, cached)
    return await hydrateNotaOfflineMediaFromCache(preserved)
  }

  const persistNotaDetailCache = async (nota: NotaRetiradaListItem | NotaRetiradaDetalheItem) => {
    const detalhe = await prepareNotaForOfflineCache(nota)
    await setOfflineCache(`${NOTAS_DETAIL_CACHE_PREFIX}${detalhe.id}`, detalhe)
    return detalhe
  }

  const hydrateAndPersistNotasInBackground = (snapshot: NotaRetiradaListItem[]) => {
    void (async () => {
      try {
        const hydrated = await Promise.all(snapshot.map(prepareNotaForOfflineCache))
        const byId = new Map(hydrated.map(item => [String(item.id), item]))

        notas.value = notas.value.map((nota) => {
          const replacement = byId.get(String(nota.id))
          return replacement || nota
        })

        await persistNotasCache()
        await Promise.all(hydrated.map(persistNotaDetailCache))
      }
      catch (error) {
        console.warn('[notas] background hydration failed', error)
      }
    })()
  }

  const findNotaLocal = (notaId: string) => {
    const id = String(notaId)
    return notas.value.find(nota => nota.id === id)
      || notasRetirada.value.find(nota => nota.id === id)
      || lixeira.value.find(nota => nota.id === id)
      || null
  }

  const replaceNotaInCaches = async (notaAtualizada: NotaRetiradaDetalheItem) => {
    const mergeListItem = (item: NotaRetiradaListItem): NotaRetiradaListItem => item.id === notaAtualizada.id
      ? { ...item, ...notaAtualizada }
      : item

    const isDeleted = Boolean((notaAtualizada as NotaRetiradaDetalheItem & { deleted_at?: string | null }).deleted_at)
    const existsMainList = notas.value.some(nota => nota.id === notaAtualizada.id)

    if (isDeleted) {
      notas.value = notas.value.filter(nota => nota.id !== notaAtualizada.id)
    }
    else {
      notas.value = existsMainList
        ? notas.value.map(mergeListItem)
        : [notaAtualizada, ...notas.value]
    }

    lixeira.value = lixeira.value.map(mergeListItem)

    const retiradaItem = toDetalheNota(notaAtualizada)
    const shouldStayOnRetiradaList = ['pendente', 'parcial'].includes(retiradaItem.status_retirada)
    const existsRetirada = notasRetirada.value.some(nota => nota.id === retiradaItem.id)

    if (shouldStayOnRetiradaList) {
      notasRetirada.value = existsRetirada
        ? notasRetirada.value.map(nota => nota.id === retiradaItem.id ? retiradaItem : nota)
        : [retiradaItem, ...notasRetirada.value]
    }
    else {
      notasRetirada.value = notasRetirada.value.filter(nota => nota.id !== retiradaItem.id)
    }

    notaDetalheAtual.value = notaAtualizada
    await Promise.all([
      persistNotasCache(),
      persistRetiradaCache(),
      persistNotaDetailCache(notaAtualizada),
    ])
  }

  const mergeNotas = (current: NotaRetiradaListItem[], incoming: NotaRetiradaListItem[]) => {
    const byId = new Map<string, NotaRetiradaListItem>()

    for (const nota of current) {
      byId.set(String(nota.id), nota)
    }

    for (const nota of incoming) {
      byId.set(String(nota.id), nota)
    }

    return [...byId.values()]
  }

  const fetchNotas = async (filters: NotasListFilters = {}, options: FetchNotasOptions = {}) => {
    const fetchId = ++activeFetchId
    const isLatest = () => fetchId === activeFetchId

    if (!options.append) {
      notas.value = []
      totalNotas.value = 0
      totalPaginas.value = 1
    }
    loadingNotas.value = true
    clearError()

    try {
      const data = await getApiFetch()<{
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

      if (!isLatest()) return notas.value

      const rawNotas = data.notas || []

      notas.value = options.append
        ? mergeNotas(notas.value, rawNotas)
        : rawNotas
      page.value = data.pagination?.page || 1
      pageSize.value = data.pagination?.page_size || (filters.page_size || pageSize.value)
      totalNotas.value = data.pagination?.total || notas.value.length
      totalPaginas.value = data.pagination?.total_pages || 1

      const snapshotForCache = notas.value.slice()
      hydrateAndPersistNotasInBackground(snapshotForCache)

      return notas.value
    }
    catch (error) {
      if (!isLatest()) return notas.value

      const localQuery = await queryOfflineNotasLocal({
        search: filters.search,
        status: filters.status,
        data_inicio: filters.data_inicio,
        data_fim: filters.data_fim,
        page: filters.page || page.value,
        page_size: filters.page_size || pageSize.value,
      })

      if (!isLatest()) return notas.value

      if (localQuery.hasSyncedCache) {
        notas.value = options.append
          ? mergeNotas(notas.value, localQuery.notas)
          : localQuery.notas
        page.value = localQuery.page
        pageSize.value = localQuery.pageSize
        totalNotas.value = localQuery.total
        totalPaginas.value = localQuery.totalPages
        errorMessage.value = 'Modo offline: exibindo notas salvas no aparelho.'
        return notas.value
      }

      const cached = await getOfflineCache<{
        notas: NotaRetiradaListItem[]
        page: number
        pageSize: number
        totalNotas: number
        totalPaginas: number
      }>(NOTAS_CACHE_KEY)

      if (cached) {
        const cachedNotas = await Promise.all(
          (cached.notas || []).map(nota => prepareNotaForOfflineCache(nota)),
        )

        if (!isLatest()) return notas.value

        const filtered = filterLocalNotas(cachedNotas, filters)
        const localPage = paginateLocalNotas(
          filtered,
          filters.page || page.value,
          filters.page_size || pageSize.value,
        )

        notas.value = options.append
          ? mergeNotas(notas.value, localPage.items)
          : localPage.items
        page.value = localPage.page
        pageSize.value = localPage.pageSize
        totalNotas.value = localPage.total
        totalPaginas.value = localPage.totalPages
        errorMessage.value = 'Modo offline: exibindo as ultimas notas salvas no aparelho.'
        return notas.value
      }

      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar notas.')
      return []
    }
    finally {
      if (fetchId === activeFetchId) {
        loadingNotas.value = false
      }
    }
  }

  const extractNota = async (imageDataUrl: string) => {
    extractingNota.value = true
    clearError()

    try {
      const data = await getApiFetch()<NotaExtractionResponse>('/api/openai/extract-nota', {
        method: 'POST',
        body: { imageDataUrl },
      })

      return data
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Falha ao analisar a imagem da nota.')
      return null
    }
    finally {
      extractingNota.value = false
    }
  }

  const queueCreateNota = async (payload: NotaRetiradaDraft) => {
    const offlineNota = createOfflineNota(payload)
    const offlineDetalhe = toDetalheNota(offlineNota)
    notas.value = [offlineNota, ...notas.value]
    notasRetirada.value = [offlineDetalhe, ...notasRetirada.value]
    totalNotas.value += 1
    await Promise.all([
      persistNotasCache(),
      persistRetiradaCache(),
      persistNotaDetailCache(offlineDetalhe),
      enqueueOfflineRequest({
        endpoint: '/api/notas/create',
        method: 'POST',
        body: payload,
        entity: 'notas',
        operation: 'create',
        entityId: offlineNota.id,
        clientId: offlineNota.id,
        description: `Criar nota ${payload.numero_nota}`,
      }),
    ])
    return offlineNota
  }

  const shouldQueueCreateAfterError = (error: unknown) => {
    if (!import.meta.client) return false
    if (!getOnlineStatus()) return true
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true

    return getApiErrorStatus(error) === null && isNetworkFetchError(error)
  }

  const createNota = async (payload: NotaRetiradaDraft) => {
    creatingNota.value = true
    clearError()

    try {
      if (!getOnlineStatus()) {
        const offlineNota = await queueCreateNota(payload)
        showSuccess('Nota salva offline. Ela sera sincronizada quando a internet voltar.')
        return { success: true, nota: offlineNota }
      }

      const data = await getApiFetch()<{
        success: boolean
        nota: NotaRetiradaDetalheItem
      }>('/api/notas/create', {
        method: 'POST',
        body: payload,
      })

      if (data?.nota?.id) {
        await replaceNotaInCaches(toDetalheNota(data.nota))
      }
      return data
    }
    catch (error) {
      if (!shouldQueueCreateAfterError(error)) {
        const msg = getApiErrorMessage(error, 'Falha ao salvar nota.')
        errorMessage.value = msg
        showError(msg)
        return { success: false, nota: null }
      }

      const offlineNota = await queueCreateNota(payload)
      clearError()
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
      const data = await getApiFetch()<{
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

      notasRetirada.value = await Promise.all(
        (data.notas || []).map(nota => prepareNotaForOfflineCache(nota)),
      )
      await persistRetiradaCache()
      await Promise.all(notasRetirada.value.map(persistNotaDetailCache))
      return notasRetirada.value
    }
    catch (error) {
      const cached = await getOfflineCache<NotaRetiradaDetalheItem[]>(NOTAS_RETIRADA_CACHE_KEY)
      if (cached) {
        notasRetirada.value = await Promise.all(cached.map(nota => prepareNotaForOfflineCache(nota)))
        errorMessage.value = 'Modo offline: exibindo retiradas salvas no aparelho.'
        return notasRetirada.value
      }

      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar notas para retirada.')
      return []
    }
    finally {
      loadingRetirada.value = false
    }
  }

  const fetchNotaDetalhe = async (notaId: string) => {
    clearError()
    const id = String(notaId || '').trim()
    if (!id) return null

    try {
      const data = await getApiFetch()<{
        success: boolean
        nota: NotaRetiradaDetalheItem
      }>(`/api/notas/${id}/detail`)

      notaDetalheAtual.value = await prepareNotaForOfflineCache(data.nota)
      await setOfflineCache(`${NOTAS_DETAIL_CACHE_PREFIX}${notaDetalheAtual.value.id}`, notaDetalheAtual.value)
      return notaDetalheAtual.value
    }
    catch (error) {
      const cached = await getOfflineCache<NotaRetiradaDetalheItem>(`${NOTAS_DETAIL_CACHE_PREFIX}${id}`)
      if (cached) {
        notaDetalheAtual.value = await prepareNotaForOfflineCache(cached)
        await setOfflineCache(`${NOTAS_DETAIL_CACHE_PREFIX}${notaDetalheAtual.value.id}`, notaDetalheAtual.value)
        errorMessage.value = 'Modo offline: exibindo detalhe salvo no aparelho.'
        return notaDetalheAtual.value
      }

      const local = findNotaLocal(id)
      if (local) {
        notaDetalheAtual.value = toDetalheNota(local)
        await persistNotaDetailCache(notaDetalheAtual.value)
        errorMessage.value = 'Modo offline: exibindo detalhe local da nota.'
        return notaDetalheAtual.value
      }

      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar detalhe da nota.')
      return null
    }
  }

  const applyLocalRetirada = async (notaId: string, payload: NotaRegistrarRetiradaRequest) => {
    const baseReativo = notaDetalheAtual.value?.id === notaId
      ? notaDetalheAtual.value
      : (await getOfflineCache<NotaRetiradaDetalheItem>(`${NOTAS_DETAIL_CACHE_PREFIX}${notaId}`)) || findNotaLocal(notaId)

    if (!baseReativo) return null

    let base: NotaRetiradaListItem | NotaRetiradaDetalheItem
    try {
      base = JSON.parse(JSON.stringify(baseReativo)) as NotaRetiradaListItem | NotaRetiradaDetalheItem
    }
    catch {
      base = baseReativo
    }

    const detalhe = toDetalheNota(base)
    const retiradaMap = new Map<string, number>()

    for (const item of payload.produtos_retirada || []) {
      const nome = String(item.nome || '').trim().toLowerCase()
      if (!nome) continue
      retiradaMap.set(nome, (retiradaMap.get(nome) || 0) + Math.max(0, toNumber(item.quantidade_retirada)))
    }

    const itensRetirados: NonNullable<NotaRetiradaHistoricoItem['itens_retirados']> = []
    const produtosAtualizados = detalhe.produtos.map((produto, index) => {
      const nome = String(produto.nome || '').trim()
      const quantidadeTotal = Math.max(0, toNumber(produto.quantidade))
      const retiradaAtual = Math.max(0, toNumber(produto.quantidade_retirada))
      const solicitada = Math.max(0, retiradaMap.get(nome.toLowerCase()) || 0)
      const efetiva = Math.min(Math.max(0, quantidadeTotal - retiradaAtual), solicitada)

      if (efetiva > 0) {
        itensRetirados.push({
          index,
          quantidade: efetiva,
          quantidade_solicitada: solicitada,
        })
      }

      return {
        ...produto,
        quantidade: quantidadeTotal,
        quantidade_retirada: Math.min(quantidadeTotal, retiradaAtual + efetiva),
      }
    })

    const statusAnterior = detalhe.status_retirada
    const statusRetirada = getStatusFromProdutos(produtosAtualizados)
    const agora = new Date().toISOString()
    const eventoHistorico: NotaRetiradaHistoricoItem = {
      data: agora,
      responsavel_id: 'offline',
      responsavel_nome: 'Pendente de sincronizacao',
      fotos: payload.foto_cliente_retirada_data_url ? [payload.foto_cliente_retirada_data_url] : [],
      itens_retirados: itensRetirados,
      observacoes: payload.observacoes ?? null,
      status_anterior: statusAnterior,
      status_novo: statusRetirada,
      usuario_id: 'offline',
    }

    const notaAtualizada: NotaRetiradaDetalheItem = {
      ...detalhe,
      produtos: produtosAtualizados,
      status_retirada: statusRetirada,
      data_retirada: statusRetirada === 'pendente' ? detalhe.data_retirada : agora,
      comprovante_retirada_url: payload.foto_cliente_retirada_data_url,
      historico_retiradas: [
        ...(Array.isArray(detalhe.historico_retiradas) ? detalhe.historico_retiradas : []),
        eventoHistorico,
      ],
      observacoes: payload.observacoes ?? detalhe.observacoes,
      _offlineStatus: 'pending_retirada',
    }

    await replaceNotaInCaches(notaAtualizada)
    return notaAtualizada
  }

  const queueRetirada = async (notaId: string, payload: NotaRegistrarRetiradaRequest) => {
    await enqueueOfflineRequest({
      endpoint: `/api/notas/${notaId}/retirada`,
      method: 'PATCH',
      body: payload,
      entity: 'notas',
      operation: 'retirada',
      entityId: notaId,
      description: `Registrar retirada da nota ${notaId}`,
    })
    return await applyLocalRetirada(notaId, payload)
  }

  const registrarRetirada = async (notaId: string, payload: NotaRegistrarRetiradaRequest) => {
    savingRetirada.value = true
    clearError()

    try {
      if (!getOnlineStatus()) {
        const notaOffline = await queueRetirada(notaId, payload)
        showSuccess('Retirada salva offline. Ela sera sincronizada quando a internet voltar.')
        return { success: true, offline: true, nota: notaOffline }
      }

      const data = await getApiFetch()<{ success: boolean; nota?: NotaRetiradaDetalheItem }>(`/api/notas/${notaId}/retirada`, {
        method: 'PATCH',
        body: payload,
      })

      if (data?.nota) {
        const notaAtualizada = toDetalheNota(data.nota)

        if (payload.foto_cliente_retirada_data_url) {
          notaAtualizada.comprovante_retirada_url = payload.foto_cliente_retirada_data_url

          const historico = Array.isArray(notaAtualizada.historico_retiradas)
            ? [...notaAtualizada.historico_retiradas]
            : []
          const ultimoIndice = historico.length - 1
          const ultimoEvento = ultimoIndice >= 0 ? historico[ultimoIndice] : null

          if (ultimoEvento) {
            historico[ultimoIndice] = {
              ...ultimoEvento,
              fotos: [payload.foto_cliente_retirada_data_url],
            }
            notaAtualizada.historico_retiradas = historico
          }
        }

        await replaceNotaInCaches(notaAtualizada)
      }
      await fetchNotasRetirada()
      showSuccess('Retirada registrada com sucesso!')
      return data
    }
    catch (error) {
      const notaOffline = await queueRetirada(notaId, payload)
      const msg = 'Sem conexao: retirada salva offline para sincronizar depois.'
      errorMessage.value = msg
      showSuccess(msg)
      return { success: true, offline: true, nota: notaOffline }
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
          operation: 'status',
          entityId: notaId,
          description: `Atualizar status da nota ${notaId}`,
        })
        const local = findNotaLocal(notaId)
        if (local) {
          await replaceNotaInCaches({
            ...toDetalheNota(local),
            status_retirada: status,
            observacoes: observacoes ?? toDetalheNota(local).observacoes,
            _offlineStatus: 'pending_status',
          })
        }
        showSuccess('Status salvo offline. Ele sera sincronizado quando a internet voltar.')
        return { success: true, offline: true }
      }

      const data = await getApiFetch()(`/api/notas/${notaId}/status`, {
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
        operation: 'status',
        entityId: notaId,
        description: `Atualizar status da nota ${notaId}`,
      })
      const local = findNotaLocal(notaId)
      if (local) {
        await replaceNotaInCaches({
          ...toDetalheNota(local),
          status_retirada: status,
          observacoes: observacoes ?? toDetalheNota(local).observacoes,
          _offlineStatus: 'pending_status',
        })
      }
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
      const data = await getApiFetch()<{
        success: boolean
        notas: NotaRetiradaListItem[]
      }>('/api/notas/lixeira')

      lixeira.value = await Promise.all(
        (data.notas || []).map(nota => prepareNotaForOfflineCache(nota)),
      )
      await setOfflineCache(NOTAS_LIXEIRA_CACHE_KEY, lixeira.value)
      await Promise.all(lixeira.value.map(persistNotaDetailCache))
      return lixeira.value
    }
    catch (error) {
      const cached = await getOfflineCache<NotaRetiradaListItem[]>(NOTAS_LIXEIRA_CACHE_KEY)
      if (cached) {
        lixeira.value = await Promise.all(cached.map(nota => prepareNotaForOfflineCache(nota)))
        errorMessage.value = 'Modo offline: exibindo lixeira salva no aparelho.'
        return lixeira.value
      }

      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar a lixeira.')
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
      const data = await getApiFetch()<{
        success: boolean
        historico: any[]
      }>(`/api/notas/${notaId}/historico`)

      historicoAtual.value = data.historico || []
      await setOfflineCache(`${NOTAS_HISTORICO_CACHE_PREFIX}${notaId}`, historicoAtual.value)
      return historicoAtual.value
    }
    catch (error) {
      const cached = await getOfflineCache<any[]>(`${NOTAS_HISTORICO_CACHE_PREFIX}${notaId}`)
      if (cached) {
        historicoAtual.value = cached
        errorMessage.value = 'Modo offline: exibindo historico salvo no aparelho.'
        return historicoAtual.value
      }

      errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar o historico da nota.')
      return []
    }
    finally {
      loadingHistorico.value = false
    }
  }

  const clearList = () => {
    notas.value = []
    page.value = 1
    totalNotas.value = 0
    totalPaginas.value = 1
  }

  const reset = () => {
    notas.value = []
    notasRetirada.value = []
    notaDetalheAtual.value = null
    lixeira.value = []
    historicoAtual.value = []
    loadingNotas.value = false
    loadingRetirada.value = false
    loadingLixeira.value = false
    loadingHistorico.value = false
    extractingNota.value = false
    creatingNota.value = false
    savingRetirada.value = false
    page.value = 1
    pageSize.value = 20
    totalNotas.value = 0
    totalPaginas.value = 1
    errorMessage.value = ''
  }

  const deleteNota = async (notaId: string) => {
    clearError()
    const id = String(notaId || '').trim()

    if (!id) {
      const msg = 'Nota invalida para exclusao.'
      errorMessage.value = msg
      showError(msg)
      return false
    }

    if (!getOnlineStatus()) {
      const msg = 'A exclusao de notas exige conexao para validar permissao de administrador.'
      errorMessage.value = msg
      showError(msg)
      return false
    }

    try {
      const data = await getApiFetch()<{ success: boolean; deletedId?: string }>(`/api/notas/${encodeURIComponent(id)}/delete`, {
        method: 'DELETE',
      })

      if (!data?.success) {
        throw new Error('A exclusao nao foi confirmada pelo servidor.')
      }

      notas.value = notas.value.filter(n => n.id !== id)
      notasRetirada.value = notasRetirada.value.filter(n => n.id !== id)
      lixeira.value = lixeira.value.filter(n => n.id !== id)
      if (notaDetalheAtual.value?.id === id) {
        notaDetalheAtual.value = null
      }
      totalNotas.value = Math.max(0, totalNotas.value - 1)
      await Promise.all([
        persistNotasCache(),
        persistRetiradaCache(),
      ])

      showSuccess('Nota excluida com seguranca.')
      return data.success
    }
    catch (error) {
      const msg = getApiErrorMessage(error, 'Falha ao excluir nota.')
      errorMessage.value = msg
      showError(msg)
      return false
    }
  }


  return {
    notas,
    notasRetirada,
    notaDetalheAtual,
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
    fetchNotaDetalhe,
    fetchNotasRetirada,
    fetchLixeira,
    fetchHistorico,
    extractNota,
    createNota,
    registrarRetirada,
    atualizarStatusNota,
    deleteNota,
    clearList,
    reset,
  }
})
