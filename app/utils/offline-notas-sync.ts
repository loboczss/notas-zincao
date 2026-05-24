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
  deleteOfflineCache,
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
  lastFullSyncAt: string | null
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
  prunedNotes: number
  prunedAssets: number
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

export type SyncOfflineNotasMode = 'full' | 'delta'

export type SyncOfflineNotasCompletoOptions = {
  pageSize?: number
  includeDeleted?: boolean
  mode?: SyncOfflineNotasMode
  since?: string | null
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
const NOTAS_RETIRADA_STORAGE_BUCKET = 'notas-retirada'

const emptyMeta = (): OfflineNotasSyncMeta => ({
  lastStartedAt: null,
  lastCompletedAt: null,
  lastFullSyncAt: null,
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
  prunedNotes: 0,
  prunedAssets: 0,
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

const isDataUrl = (value: unknown) => String(value || '').trim().startsWith('data:')

const getOfflineStorageObjectPath = (
  value: unknown,
  bucket = NOTAS_RETIRADA_STORAGE_BUCKET,
) => {
  const raw = String(value || '').trim()

  if (!raw || isDataUrl(raw)) {
    return null
  }

  const extractFromPath = (input: string) => {
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
      `/storage/v1/render/image/public/${bucket}/`,
      `/storage/v1/render/image/sign/${bucket}/`,
      `/storage/v1/render/image/authenticated/${bucket}/`,
    ]

    for (const marker of markers) {
      const index = input.indexOf(marker)
      if (index >= 0) {
        return input.slice(index + marker.length)
      }
    }

    return null
  }

  let path: string | null = null

  try {
    const url = new URL(raw)
    path = extractFromPath(decodeURIComponent(url.pathname))
  }
  catch {
    path = extractFromPath(decodeURIComponent(raw.split('?')[0] || raw))
  }

  if (!path && !/^https?:\/\//i.test(raw)) {
    path = raw
  }

  if (!path) {
    return null
  }

  const normalized = path
    .split('?')[0]!
    .split('#')[0]!
    .replace(/^\/+/, '')

  return normalized.startsWith(`${bucket}/`)
    ? normalized.slice(bucket.length + 1)
    : normalized
}

const getNotaMediaCandidates = (nota: Record<string, any>) => {
  const candidates: Array<{ field: string; value: unknown }> = [
    { field: 'foto_url', value: nota.foto_url },
    { field: 'foto_cliente_url', value: nota.foto_cliente_url },
    { field: 'comprovante_retirada_url', value: nota.comprovante_retirada_url },
  ]

  const historico = Array.isArray(nota.historico_retiradas)
    ? nota.historico_retiradas
    : []

  historico.forEach((item: any, historicoIndex: number) => {
    const fotos = Array.isArray(item?.fotos) ? item.fotos : []
    fotos.forEach((foto: unknown, fotoIndex: number) => {
      candidates.push({
        field: `historico_retiradas.${historicoIndex}.fotos.${fotoIndex}`,
        value: foto,
      })
    })
  })

  return candidates
}

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

export const preserveNotaOfflineMediaDataUrls = <T extends Record<string, any>>(
  incoming: T,
  cached?: Record<string, any> | null,
): T => {
  if (!cached) return incoming

  const merged = cloneJson(incoming)
  const cachedValuesByField = new Map(
    getNotaMediaCandidates(cached)
      .filter(candidate => isDataUrl(candidate.value))
      .map(candidate => [candidate.field, String(candidate.value)] as const),
  )

  if (!cachedValuesByField.size) return merged

  for (const candidate of getNotaMediaCandidates(merged)) {
    if (isDataUrl(candidate.value)) continue

    const cachedValue = cachedValuesByField.get(candidate.field)
    if (cachedValue) {
      setFieldValue(merged, candidate.field, cachedValue)
    }
  }

  return merged
}

export const hydrateNotaOfflineMediaFromCache = async <T extends Record<string, any>>(
  nota: T,
): Promise<T> => {
  const hydrated = cloneJson(nota)

  for (const candidate of getNotaMediaCandidates(hydrated)) {
    if (isDataUrl(candidate.value)) continue

    const path = getOfflineStorageObjectPath(candidate.value)
    if (!path) continue

    const cached = await getOfflineCache<OfflineNotasSyncAssetCache>(assetCacheKey({
      bucket: NOTAS_RETIRADA_STORAGE_BUCKET,
      path,
    }))

    if (cached?.dataUrl) {
      setFieldValue(hydrated, candidate.field, cached.dataUrl)
    }
  }

  return hydrated
}

const toListItem = (nota: OfflineNotaSyncData | NotaRetiradaDetalheItem): NotaRetiradaListItem => ({
  id: nota.id,
  contato_id: nota.contato_id,
  nome_cliente: nota.nome_cliente,
  numero_nota: nota.numero_nota,
  serie_nota: nota.serie_nota,
  chave_nfe: nota.chave_nfe,
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

const notaSortKey = (nota: NotaRetiradaDetalheItem) => {
  return String(nota.criado_em || nota.data_compra || '')
}

const sortNotasByCriadoEmDesc = (notas: NotaRetiradaDetalheItem[]) => {
  return notas.sort((a, b) => {
    const keyA = notaSortKey(a)
    const keyB = notaSortKey(b)
    if (keyA === keyB) return String(b.id).localeCompare(String(a.id))
    return keyA < keyB ? 1 : -1
  })
}

export const queryOfflineNotasLocal = async (
  filters: OfflineNotasLocalQuery = {},
): Promise<OfflineNotasLocalQueryResult> => {
  const requestedPage = Math.max(1, filters.page || 1)
  const requestedPageSize = Math.max(1, filters.page_size || 20)
  const start = (requestedPage - 1) * requestedPageSize
  const meta = await getOfflineNotasSyncMeta()
  const matched: NotaRetiradaDetalheItem[] = []
  const seenIds = new Set<string>()
  let scanned = 0

  await scanOfflineCacheByPrefix<NotaRetiradaDetalheItem>(
    NOTAS_DETAIL_CACHE_PREFIX,
    (entry) => {
      scanned += 1
      const detail = entry.value
      if (!detail || !matchesLocalNotaFilters(detail, filters, filters.includeDeleted)) return

      const id = String(detail.id)
      if (seenIds.has(id)) return
      seenIds.add(id)
      matched.push(detail)
    },
  )

  sortNotasByCriadoEmDesc(matched)

  const total = matched.length
  const totalPages = Math.max(1, Math.ceil(total / requestedPageSize))
  const items = matched.slice(start, start + requestedPageSize).map(toListItem)

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

const fetchNotasSyncPage = async (
  page: number,
  pageSize: number,
  includeDeleted: boolean,
  since?: string | null,
) => {
  const query: Record<string, string | number> = {
    page,
    page_size: pageSize,
    include_deleted: includeDeleted ? 'true' : 'false',
  }
  if (since) {
    query.since = since
  }
  return await getApiFetch()<OfflineNotasSyncResponse>('/api/sync/notas', {
    query,
  })
}

const pruneStaleNotaCaches = async (
  preservedIds: Set<string>,
  preservedAssetKeys: Set<string>,
) => {
  const staleDetailKeys: string[] = []
  const staleHistoricoKeys: string[] = []
  const staleAssetKeys: string[] = []

  await scanOfflineCacheByPrefix(NOTAS_DETAIL_CACHE_PREFIX, (entry) => {
    const id = entry.key.slice(NOTAS_DETAIL_CACHE_PREFIX.length)
    if (!preservedIds.has(id)) staleDetailKeys.push(entry.key)
  })

  await scanOfflineCacheByPrefix(NOTAS_HISTORICO_CACHE_PREFIX, (entry) => {
    const id = entry.key.slice(NOTAS_HISTORICO_CACHE_PREFIX.length)
    if (!preservedIds.has(id)) staleHistoricoKeys.push(entry.key)
  })

  await scanOfflineCacheByPrefix(OFFLINE_NOTAS_SYNC_ASSET_PREFIX, (entry) => {
    if (!preservedAssetKeys.has(entry.key)) staleAssetKeys.push(entry.key)
  })

  await Promise.all([
    ...staleDetailKeys.map(deleteOfflineCache),
    ...staleHistoricoKeys.map(deleteOfflineCache),
    ...staleAssetKeys.map(deleteOfflineCache),
  ])

  return {
    prunedNotes: staleDetailKeys.length,
    prunedAssets: staleAssetKeys.length,
  }
}

const collectOfflineQueueProtectedIds = async () => {
  const queue = await getOfflineQueue('notas')
  const ids = new Set<string>()
  for (const entry of queue) {
    if (entry.entityId) ids.add(entry.entityId)
    if (entry.clientId) ids.add(entry.clientId)
  }
  return ids
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
  const mode: SyncOfflineNotasMode = options.mode || 'full'
  const since = mode === 'delta' ? (options.since ?? null) : null

  const previousMeta = await getOfflineNotasSyncMeta()
  const meta = {
    ...emptyMeta(),
    ...(previousMeta || {}),
    lastStartedAt: startedAt,
    includeDeleted,
    prunedNotes: 0,
    prunedAssets: 0,
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
  const seenNoteIds = new Set<string>()
  const seenAssetKeys = new Set<string>()
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
    const response = await fetchNotasSyncPage(page, pageSize, includeDeleted, since)
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
      seenNoteIds.add(String(item.id))
      options.onProgress?.({
        stage: 'note',
        note: item,
        status: data.deleted_at ? 'deleted' : 'saving',
        processedNotes,
        totalCloudNotes,
      })

      for (const asset of item.assets) {
        seenAssetKeys.add(assetCacheKey(asset))
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
    if (mode === 'full') {
      await persistNotasCollectionsPreview(activePreview, deletedPreview, {
        activeNotes: activeNotesCount,
        deletedNotes: deletedNotesCount,
      })
    }
    await yieldToBrowser()

    hasMore = response.pagination.has_more
    page = response.pagination.next_page || page + 1
  }

  let prunedNotes = 0
  let prunedAssets = 0

  if (mode === 'full') {
    await persistNotasCollectionsPreview(activePreview, deletedPreview, {
      activeNotes: activeNotesCount,
      deletedNotes: deletedNotesCount,
    })

    const protectedIds = await collectOfflineQueueProtectedIds()
    const preservedIds = new Set<string>([...seenNoteIds, ...protectedIds])
    const pruneResult = await pruneStaleNotaCaches(preservedIds, seenAssetKeys)
    prunedNotes = pruneResult.prunedNotes
    prunedAssets = pruneResult.prunedAssets
  }

  const completedAt = new Date().toISOString()
  const baseSummary: OfflineNotasSyncSummary = {
    ...meta,
    completed: true,
    lastCompletedAt: completedAt,
    lastFullSyncAt: mode === 'full' ? completedAt : (meta.lastFullSyncAt || null),
    permissions: permissions || meta.permissions,
    downloadedNotes: processedNotes,
    downloadedAssets,
    cachedAssets,
    failedAssets,
    uploadedQueueItems,
    failedQueueItems,
    pendingQueueItems,
    prunedNotes,
    prunedAssets,
    totalCloudNotes: mode === 'full' ? totalCloudNotes : (meta.totalCloudNotes || totalCloudNotes),
    activeNotes: mode === 'full' ? activeNotesCount : meta.activeNotes,
    deletedNotes: mode === 'full' ? deletedNotesCount : meta.deletedNotes,
  }

  const summary = mode === 'full'
    ? baseSummary
    : await reconcileDeltaMetaCounts(baseSummary)

  await setOfflineCache(OFFLINE_NOTAS_SYNC_META_KEY, summary)
  options.onProgress?.({ stage: 'done', summary })

  return summary
}

const reconcileDeltaMetaCounts = async (
  summary: OfflineNotasSyncSummary,
): Promise<OfflineNotasSyncSummary> => {
  let active = 0
  let deleted = 0

  await scanOfflineCacheByPrefix<NotaRetiradaDetalheItem>(
    NOTAS_DETAIL_CACHE_PREFIX,
    (entry) => {
      const detail = entry.value as (NotaRetiradaDetalheItem & { deleted_at?: string | null }) | undefined
      if (!detail) return
      if (detail.deleted_at) deleted += 1
      else active += 1
    },
  )

  return {
    ...summary,
    activeNotes: active,
    deletedNotes: deleted,
    totalCloudNotes: active + deleted,
  }
}
