import type {
  NotaRetiradaDetalheItem,
  NotaRetiradaListItem,
} from '../../shared/types/NotasRetirada'
import type {
  OfflineNotaAsset,
  OfflineNotaSyncData,
  OfflineNotaSyncItem,
  OfflineNotasSyncPermissions,
  OfflineNotasSyncResponse,
} from '../../shared/types/OfflineNotasSync'
import { getApiFetch } from './api-fetch'
import {
  getOfflineCache,
  getOfflineQueue,
  getOnlineStatus,
  scanOfflineCacheByPrefix,
  setOfflineCache,
  setOfflineCaches,
  syncOfflineQueue,
  type OfflineQueueSyncProgress,
} from './offline-db'
import {
  NOTAS_CACHE_KEY,
  NOTAS_DETAIL_CACHE_PREFIX,
  NOTAS_HISTORICO_CACHE_PREFIX,
  NOTAS_LIXEIRA_CACHE_KEY,
  NOTAS_RETIRADA_CACHE_KEY,
  OFFLINE_NOTAS_SYNC_ASSET_PREFIX,
  OFFLINE_NOTAS_SYNC_META_KEY,
} from './offline-cache-keys'

export type OfflineNotasSyncAssetStatus = 'cached' | 'downloaded' | 'inline' | 'missing' | 'failed'

export type OfflineNotasSyncAssetCache = {
  key: string
  bucket: string
  path: string
  dataUrl: string
  contentType: string | null
  bytes: number
  sourceValue: string
  downloadedAt: string
}

export type OfflineNotasSyncMeta = {
  lastStartedAt: string | null
  lastCompletedAt: string | null
  permissions: OfflineNotasSyncPermissions | null
  includeDeleted: boolean
  totalCloudNotes: number
  downloadedNotes: number
  activeNotes: number
  deletedNotes: number
  downloadedAssets: number
  cachedAssets: number
  failedAssets: number
  uploadedQueueItems: number
  failedQueueItems: number
  pendingQueueItems: number
}

export type OfflineNotasSyncSummary = OfflineNotasSyncMeta & {
  completed: boolean
}

export type OfflineNotasSyncProgressEvent =
  | {
      stage: 'upload'
      upload: OfflineQueueSyncProgress
    }
  | {
      stage: 'page'
      page: number
      totalPages: number
      totalCloudNotes: number
      completedBeforePage: number
      returnedNotes: number
      remainingAfterPage: number
      permissions: OfflineNotasSyncPermissions
    }
  | {
      stage: 'note'
      note: OfflineNotaSyncItem
      status: 'saving' | 'saved' | 'deleted'
      processedNotes: number
      totalCloudNotes: number
    }
  | {
      stage: 'asset'
      note: OfflineNotaSyncItem
      asset: OfflineNotaAsset
      status: OfflineNotasSyncAssetStatus
      downloadedAssets: number
      cachedAssets: number
      failedAssets: number
      discoveredAssets: number
      error?: string
    }
  | {
      stage: 'done'
      summary: OfflineNotasSyncSummary
    }

export type SyncOfflineNotasCompletoOptions = {
  pageSize?: number
  includeDeleted?: boolean
  onProgress?: (event: OfflineNotasSyncProgressEvent) => void
}

export type OfflineNotasLocalSnapshot = {
  activeNotes: number
  retiradaNotes: number
  deletedNotes: number
  pendingQueueItems: number
  meta: OfflineNotasSyncMeta | null
}

const DEFAULT_PAGE_SIZE = 100
const LEGACY_LIST_CACHE_LIMIT = 100
const YIELD_EVERY_NOTES = 10

const emptyMeta = (): OfflineNotasSyncMeta => ({
  lastStartedAt: null,
  lastCompletedAt: null,
  permissions: null,
  includeDeleted: true,
  totalCloudNotes: 0,
  downloadedNotes: 0,
  activeNotes: 0,
  deletedNotes: 0,
  downloadedAssets: 0,
  cachedAssets: 0,
  failedAssets: 0,
  uploadedQueueItems: 0,
  failedQueueItems: 0,
  pendingQueueItems: 0,
})

const cloneJson = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

const yieldToBrowser = () => new Promise<void>((resolve) => {
  if (typeof window === 'undefined') {
    resolve()
    return
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => resolve(), { timeout: 80 })
    return
  }

  window.setTimeout(resolve, 0)
})

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

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(reader.error || new Error('Falha ao ler imagem baixada.'))
  reader.readAsDataURL(blob)
})

const assetCacheKey = (asset: Pick<OfflineNotaAsset, 'bucket' | 'path'>) => {
  return `${OFFLINE_NOTAS_SYNC_ASSET_PREFIX}${asset.bucket}:${asset.path}`
}

const getCachedAsset = async (asset: OfflineNotaAsset) => {
  return await getOfflineCache<OfflineNotasSyncAssetCache>(assetCacheKey(asset))
}

const saveAssetCache = async (asset: OfflineNotaAsset, dataUrl: string, blob?: Blob) => {
  const entry: OfflineNotasSyncAssetCache = {
    key: assetCacheKey(asset),
    bucket: asset.bucket,
    path: asset.path,
    dataUrl,
    contentType: blob?.type || null,
    bytes: blob?.size || dataUrl.length,
    sourceValue: asset.source_value,
    downloadedAt: new Date().toISOString(),
  }

  await setOfflineCache(entry.key, entry)
  return entry
}

const resolveAssetDataUrl = async (asset: OfflineNotaAsset) => {
  const cached = await getCachedAsset(asset)
  if (cached?.dataUrl) {
    return { dataUrl: cached.dataUrl, status: 'cached' as const }
  }

  if (asset.source_value.startsWith('data:')) {
    await saveAssetCache(asset, asset.source_value)
    return { dataUrl: asset.source_value, status: 'inline' as const }
  }

  if (!asset.download_url) {
    return { dataUrl: null, status: 'missing' as const }
  }

  const response = await fetch(asset.download_url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Imagem ${asset.path} retornou HTTP ${response.status}.`)
  }

  const blob = await response.blob()
  const dataUrl = await blobToDataUrl(blob)
  await saveAssetCache(asset, dataUrl, blob)
  return { dataUrl, status: 'downloaded' as const }
}

const setFieldValue = (target: Record<string, any>, field: string, value: string) => {
  const parts = field.split('.').filter(Boolean)
  if (!parts.length) return

  let cursor: any = target
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index] as string
    const key = /^\d+$/.test(part) ? Number(part) : part
    cursor = cursor?.[key]
    if (!cursor) return
  }

  const last = parts[parts.length - 1] as string
  const key = /^\d+$/.test(last) ? Number(last) : last
  cursor[key] = value
}

const toListItem = (nota: OfflineNotaSyncData | NotaRetiradaDetalheItem): NotaRetiradaListItem => ({
  id: nota.id,
  contato_id: nota.contato_id,
  nome_cliente: nota.nome_cliente,
  numero_nota: nota.numero_nota,
  serie_nota: nota.serie_nota,
  data_compra: nota.data_compra,
  data_retirada: nota.data_retirada,
  valor_total: nota.valor_total,
  desconto_total: nota.desconto_total,
  status_retirada: nota.status_retirada,
  criado_em: nota.criado_em,
  produtos: Array.isArray(nota.produtos) ? nota.produtos : [],
  foto_url: nota.foto_url,
  foto_cliente_url: nota.foto_cliente_url,
  comprovante_retirada_url: nota.comprovante_retirada_url,
  cadastrado_por_nome: nota.cadastrado_por_nome,
})

const toDetailItem = (nota: OfflineNotaSyncData): NotaRetiradaDetalheItem => ({
  ...toListItem(nota),
  contato_id: nota.contato_id,
  produtos: Array.isArray(nota.produtos) ? nota.produtos : [],
  historico_retiradas: Array.isArray(nota.historico_retiradas) ? nota.historico_retiradas : [],
  documento_cliente: nota.documento_cliente,
  telefone_cliente: nota.telefone_cliente,
  observacoes: nota.observacoes,
  cadastrado_por_nome: nota.cadastrado_por_nome,
  criado_em: nota.criado_em,
  deleted_at: nota.deleted_at,
  deleted_by: nota.deleted_by,
} as NotaRetiradaDetalheItem)

const isRetiradaAberta = (nota: NotaRetiradaDetalheItem) => {
  return nota.status_retirada === 'pendente' || nota.status_retirada === 'parcial'
}

const createNotaCacheEntries = (nota: OfflineNotaSyncData) => {
  const detail = toDetailItem(nota)

  return {
    detail,
    entries: [
      {
        key: `${NOTAS_DETAIL_CACHE_PREFIX}${detail.id}`,
        value: detail,
      },
      {
        key: `${NOTAS_HISTORICO_CACHE_PREFIX}${detail.id}`,
        value: Array.isArray(detail.historico_retiradas) ? detail.historico_retiradas : [],
      },
    ],
  }
}

const persistNotasCollectionsPreview = async (
  activeNotes: NotaRetiradaDetalheItem[],
  deletedNotes: NotaRetiradaDetalheItem[],
  counts: {
    activeNotes: number
    deletedNotes: number
  },
) => {
  const listItems = activeNotes.slice(0, LEGACY_LIST_CACHE_LIMIT).map(toListItem)
  const retiradaItems = activeNotes.filter(isRetiradaAberta).slice(0, LEGACY_LIST_CACHE_LIMIT)
  const lixeiraItems = deletedNotes.slice(0, LEGACY_LIST_CACHE_LIMIT).map(toListItem)

  await Promise.all([
    setOfflineCache(NOTAS_CACHE_KEY, {
      notas: listItems,
      page: 1,
      pageSize: Math.max(20, listItems.length || 20),
      totalNotas: counts.activeNotes,
      totalPaginas: Math.max(1, Math.ceil(counts.activeNotes / 20)),
      previewOnly: true,
    }),
    setOfflineCache(NOTAS_RETIRADA_CACHE_KEY, retiradaItems),
    setOfflineCache(NOTAS_LIXEIRA_CACHE_KEY, lixeiraItems),
  ])
}

export type OfflineNotasLocalQuery = {
  search?: string
  status?: 'todos' | NotaRetiradaDetalheItem['status_retirada']
  data_inicio?: string
  data_fim?: string
  page?: number
  page_size?: number
  includeDeleted?: boolean
}

export type OfflineNotasLocalQueryResult = {
  notas: NotaRetiradaListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  scanned: number
  hasSyncedCache: boolean
}

const matchesLocalNotaFilters = (
  nota: NotaRetiradaDetalheItem,
  filters: OfflineNotasLocalQuery,
  includeDeleted = false,
) => {
  const deletedAt = (nota as NotaRetiradaDetalheItem & { deleted_at?: string | null }).deleted_at
  if (!includeDeleted && deletedAt) return false

  const status = filters.status && filters.status !== 'todos' ? filters.status : null
  const dataInicio = String(filters.data_inicio || '').trim()
  const dataFim = String(filters.data_fim || '').trim()
  const search = normalizeSearchText(filters.search)

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
    nota.documento_cliente,
    nota.telefone_cliente,
    nota.cadastrado_por_nome,
    produtos,
  ].join(' '))

  return searchable.includes(search)
}

export const queryOfflineNotasLocal = async (
  filters: OfflineNotasLocalQuery = {},
): Promise<OfflineNotasLocalQueryResult> => {
  const requestedPage = Math.max(1, filters.page || 1)
  const requestedPageSize = Math.max(1, filters.page_size || 20)
  const start = (requestedPage - 1) * requestedPageSize
  const end = start + requestedPageSize
  const items: NotaRetiradaListItem[] = []
  const meta = await getOfflineNotasSyncMeta()
  const hasFilters = Boolean(
    normalizeSearchText(filters.search)
    || (filters.status && filters.status !== 'todos')
    || String(filters.data_inicio || '').trim()
    || String(filters.data_fim || '').trim(),
  )
  const canUseMetaTotal = !hasFilters && Boolean(meta?.lastCompletedAt)
  let total = canUseMetaTotal
    ? (filters.includeDeleted ? (meta?.activeNotes || 0) + (meta?.deletedNotes || 0) : meta?.activeNotes || 0)
    : 0
  let matched = 0
  let scanned = 0

  await scanOfflineCacheByPrefix<NotaRetiradaDetalheItem>(
    NOTAS_DETAIL_CACHE_PREFIX,
    (entry) => {
      scanned += 1
      const detail = entry.value
      if (!detail || !matchesLocalNotaFilters(detail, filters, filters.includeDeleted)) return

      if (canUseMetaTotal) {
        if (matched >= start && items.length < requestedPageSize) {
          items.push(toListItem(detail))
        }
        matched += 1
        return items.length >= requestedPageSize ? false : undefined
      }

      if (total >= start && total < end) {
        items.push(toListItem(detail))
      }
      total += 1
    },
  )

  const totalPages = Math.max(1, Math.ceil(total / requestedPageSize))

  return {
    notas: items,
    page: requestedPage,
    pageSize: requestedPageSize,
    total,
    totalPages,
    scanned,
    hasSyncedCache: Boolean(meta?.lastCompletedAt || scanned > 0),
  }
}

const fetchNotasSyncPage = async (page: number, pageSize: number, includeDeleted: boolean) => {
  return await getApiFetch()<OfflineNotasSyncResponse>('/api/sync/notas', {
    query: {
      page,
      page_size: pageSize,
      include_deleted: includeDeleted ? 'true' : 'false',
    },
  })
}

export const getOfflineNotasSyncMeta = async () => {
  return await getOfflineCache<OfflineNotasSyncMeta>(OFFLINE_NOTAS_SYNC_META_KEY)
}

export const getOfflineNotasLocalSnapshot = async (): Promise<OfflineNotasLocalSnapshot> => {
  const [notasCache, retiradaCache, lixeiraCache, queue, meta] = await Promise.all([
    getOfflineCache<{ notas?: NotaRetiradaListItem[] }>(NOTAS_CACHE_KEY),
    getOfflineCache<NotaRetiradaDetalheItem[]>(NOTAS_RETIRADA_CACHE_KEY),
    getOfflineCache<NotaRetiradaListItem[]>(NOTAS_LIXEIRA_CACHE_KEY),
    getOfflineQueue(),
    getOfflineNotasSyncMeta(),
  ])

  const activeNotes = meta?.activeNotes
    ?? (typeof (notasCache as any)?.totalNotas === 'number'
      ? (notasCache as any).totalNotas
      : Array.isArray(notasCache?.notas) ? notasCache.notas.length : 0)
  const deletedNotes = meta?.deletedNotes
    ?? (Array.isArray(lixeiraCache) ? lixeiraCache.length : 0)

  return {
    activeNotes,
    retiradaNotes: Array.isArray(retiradaCache) ? retiradaCache.length : 0,
    deletedNotes,
    pendingQueueItems: queue.length,
    meta,
  }
}

export const syncOfflineNotasCompleto = async (
  options: SyncOfflineNotasCompletoOptions = {},
): Promise<OfflineNotasSyncSummary> => {
  if (!import.meta.client) {
    throw new Error('A sincronizacao offline precisa rodar no dispositivo.')
  }

  if (!getOnlineStatus()) {
    throw new Error('Conecte o aparelho a internet para baixar as notas da nuvem.')
  }

  const startedAt = new Date().toISOString()
  const pageSize = options.pageSize || DEFAULT_PAGE_SIZE
  const includeDeleted = options.includeDeleted ?? true
  const meta = {
    ...emptyMeta(),
    lastStartedAt: startedAt,
    includeDeleted,
  }

  let uploadedQueueItems = 0
  let failedQueueItems = 0
  let pendingQueueItems = 0

  const uploadResult = await syncOfflineQueue({
    onProgress: upload => options.onProgress?.({ stage: 'upload', upload }),
  })
  uploadedQueueItems = uploadResult.synced
  failedQueueItems = uploadResult.failed
  pendingQueueItems = uploadResult.pending

  const activePreview: NotaRetiradaDetalheItem[] = []
  const deletedPreview: NotaRetiradaDetalheItem[] = []
  let page = 1
  let hasMore = true
  let totalCloudNotes = 0
  let permissions: OfflineNotasSyncPermissions | null = null
  let processedNotes = 0
  let activeNotesCount = 0
  let deletedNotesCount = 0
  let discoveredAssets = 0
  let downloadedAssets = 0
  let cachedAssets = 0
  let failedAssets = 0

  while (hasMore) {
    const response = await fetchNotasSyncPage(page, pageSize, includeDeleted)
    permissions = response.permissions
    totalCloudNotes = response.pagination.total
    discoveredAssets += response.progress.download.returned_assets

    options.onProgress?.({
      stage: 'page',
      page: response.pagination.page,
      totalPages: response.pagination.total_pages,
      totalCloudNotes,
      completedBeforePage: response.progress.download.completed_before_page,
      returnedNotes: response.progress.download.returned_notes,
      remainingAfterPage: response.progress.download.remaining_after_page,
      permissions,
    })

    const pageCacheEntries: Array<{ key: string; value: unknown }> = []

    for (const item of response.notas) {
      const data = cloneJson(item.data)
      options.onProgress?.({
        stage: 'note',
        note: item,
        status: data.deleted_at ? 'deleted' : 'saving',
        processedNotes,
        totalCloudNotes,
      })

      for (const asset of item.assets) {
        try {
          const assetResult = await resolveAssetDataUrl(asset)
          if (assetResult.dataUrl) {
            setFieldValue(data as Record<string, any>, asset.field, assetResult.dataUrl)
          }

          if (assetResult.status === 'cached') cachedAssets += 1
          if (assetResult.status === 'downloaded' || assetResult.status === 'inline') downloadedAssets += 1

          options.onProgress?.({
            stage: 'asset',
            note: item,
            asset,
            status: assetResult.status,
            downloadedAssets,
            cachedAssets,
            failedAssets,
            discoveredAssets,
          })
        }
        catch (error) {
          failedAssets += 1
          options.onProgress?.({
            stage: 'asset',
            note: item,
            asset,
            status: 'failed',
            downloadedAssets,
            cachedAssets,
            failedAssets,
            discoveredAssets,
            error: error instanceof Error ? error.message : 'Falha ao baixar imagem.',
          })
        }
      }

      const { detail, entries } = createNotaCacheEntries(data)
      pageCacheEntries.push(...entries)

      if (data.deleted_at) {
        deletedNotesCount += 1
        if (deletedPreview.length < LEGACY_LIST_CACHE_LIMIT) {
          deletedPreview.push(detail)
        }
      }
      else {
        activeNotesCount += 1
        if (activePreview.length < LEGACY_LIST_CACHE_LIMIT) {
          activePreview.push(detail)
        }
      }

      processedNotes += 1
      options.onProgress?.({
        stage: 'note',
        note: item,
        status: data.deleted_at ? 'deleted' : 'saved',
        processedNotes,
        totalCloudNotes,
      })

      if (processedNotes % YIELD_EVERY_NOTES === 0) {
        await yieldToBrowser()
      }
    }

    await setOfflineCaches<unknown>(pageCacheEntries)
    await persistNotasCollectionsPreview(activePreview, deletedPreview, {
      activeNotes: activeNotesCount,
      deletedNotes: deletedNotesCount,
    })
    await yieldToBrowser()

    hasMore = response.pagination.has_more
    page = response.pagination.next_page || page + 1
  }

  await persistNotasCollectionsPreview(activePreview, deletedPreview, {
    activeNotes: activeNotesCount,
    deletedNotes: deletedNotesCount,
  })

  const completedAt = new Date().toISOString()
  const summary: OfflineNotasSyncSummary = {
    ...meta,
    completed: true,
    lastCompletedAt: completedAt,
    permissions,
    totalCloudNotes,
    downloadedNotes: processedNotes,
    activeNotes: activeNotesCount,
    deletedNotes: deletedNotesCount,
    downloadedAssets,
    cachedAssets,
    failedAssets,
    uploadedQueueItems,
    failedQueueItems,
    pendingQueueItems,
  }

  await setOfflineCache(OFFLINE_NOTAS_SYNC_META_KEY, summary)
  options.onProgress?.({ stage: 'done', summary })

  return summary
}
