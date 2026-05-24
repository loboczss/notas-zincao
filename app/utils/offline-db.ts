import { isRef, toRaw } from 'vue'
import { getApiFetch } from './api-fetch'

export type OfflineRequestMethod = 'POST' | 'PATCH' | 'DELETE'
export type OfflineQueueEntity = 'notas' | 'estoque' | 'auth'
export type OfflineQueueOperation = 'create' | 'update' | 'delete' | 'retirada' | 'status' | 'unknown'

export type OfflineQueueEntry = {
  id: string
  endpoint: string
  method: OfflineRequestMethod
  body?: unknown
  entity: OfflineQueueEntity
  operation?: OfflineQueueOperation
  entityId?: string
  clientId?: string
  description: string
  createdAt: string
  attempts: number
  lastError?: string
}

export type OfflineIdMapping = {
  clientId: string
  serverId: string
  entity: OfflineQueueEntity
  syncedAt: string
}

export type OfflineQueueSummary = {
  total: number
  failed: number
  oldestCreatedAt: string | null
  newestCreatedAt: string | null
  byEntity: Record<OfflineQueueEntity, number>
  byOperation: Record<OfflineQueueOperation, number>
}

export type OfflineSyncResult = {
  synced: number
  failed: number
  pending: number
}

export type OfflineQueueSyncProgress = {
  total: number
  processed: number
  synced: number
  failed: number
  pending: number
  currentEntry: OfflineQueueEntry | null
}

export type SyncOfflineQueueOptions = {
  onProgress?: (progress: OfflineQueueSyncProgress) => void
}

export type OfflineCacheEntry<T = unknown> = {
  key: string
  value: T
  updatedAt: string
}

export const OFFLINE_QUEUE_CHANGED_EVENT = 'notas-zincao:offline-queue-changed'

const DB_NAME = 'notas-zincao-offline'
const DB_VERSION = 2
const CACHE_STORE = 'cache'
const QUEUE_STORE = 'queue'
const ID_MAPPING_STORE = 'idMappings'

let dbPromise: Promise<IDBDatabase> | null = null

const isCloneableBinary = (value: object) => {
  return value instanceof ArrayBuffer
    || ArrayBuffer.isView(value)
    || (typeof Blob !== 'undefined' && value instanceof Blob)
    || (typeof File !== 'undefined' && value instanceof File)
}

const sanitizeForIndexedDB = (value: unknown, seen = new WeakMap<object, unknown>()): unknown => {
  if (value === null || value === undefined) {
    return value
  }

  if (isRef(value)) {
    return sanitizeForIndexedDB(value.value, seen)
  }

  if (typeof value !== 'object') {
    return typeof value === 'symbol' || typeof value === 'function' ? undefined : value
  }

  const raw = toRaw(value)

  if (seen.has(raw)) {
    return seen.get(raw)
  }

  if (raw instanceof Date) {
    return new Date(raw.getTime())
  }

  if (raw instanceof RegExp) {
    return new RegExp(raw)
  }

  if (isCloneableBinary(raw)) {
    return structuredClone(raw)
  }

  if (Array.isArray(raw)) {
    const output: unknown[] = []
    seen.set(raw, output)
    raw.forEach(item => output.push(sanitizeForIndexedDB(item, seen)))
    return output
  }

  if (raw instanceof Map) {
    const output = new Map()
    seen.set(raw, output)
    raw.forEach((mapValue, mapKey) => {
      output.set(sanitizeForIndexedDB(mapKey, seen), sanitizeForIndexedDB(mapValue, seen))
    })
    return output
  }

  if (raw instanceof Set) {
    const output = new Set()
    seen.set(raw, output)
    raw.forEach(item => output.add(sanitizeForIndexedDB(item, seen)))
    return output
  }

  const output: Record<string, unknown> = {}
  seen.set(raw, output)

  for (const [key, item] of Object.entries(raw)) {
    const sanitized = sanitizeForIndexedDB(item, seen)
    if (sanitized !== undefined || item === undefined) {
      output[key] = sanitized
    }
  }

  return output
}

const makeIndexedDBSafe = <T>(value: T): T => {
  const safeValue = sanitizeForIndexedDB(value)

  try {
    return structuredClone(safeValue) as T
  }
  catch {
    try {
      return JSON.parse(JSON.stringify(safeValue)) as T
    }
    catch {
      throw new Error('Falha ao preparar dados offline para salvar no aparelho.')
    }
  }
}

const assertClient = () => {
  if (!import.meta.client || typeof indexedDB === 'undefined') {
    throw new Error('Offline storage is only available in the browser.')
  }
}

const openDb = () => {
  assertClient()

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queue = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
        queue.createIndex('createdAt', 'createdAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(ID_MAPPING_STORE)) {
        const mappings = db.createObjectStore(ID_MAPPING_STORE, { keyPath: 'clientId' })
        mappings.createIndex('entity', 'entity', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

const runStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const db = await openDb()

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = callback(store)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

export const isOfflineStorageAvailable = () => import.meta.client && typeof indexedDB !== 'undefined'

export const getOnlineStatus = () => import.meta.client ? navigator.onLine : true

const notifyOfflineQueueChanged = () => {
  if (!import.meta.client) return
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT))
}

export const setOfflineCache = async <T>(key: string, value: T) => {
  if (!isOfflineStorageAvailable()) return

  const entry = makeIndexedDBSafe<OfflineCacheEntry<T>>({
    key,
    value: makeIndexedDBSafe(value),
    updatedAt: new Date().toISOString(),
  })

  await runStore<IDBValidKey>(CACHE_STORE, 'readwrite', store => store.put(entry))
}

export const setOfflineCaches = async <T>(entries: Array<{ key: string; value: T }>) => {
  if (!isOfflineStorageAvailable() || entries.length === 0) return

  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE, 'readwrite')
    const store = transaction.objectStore(CACHE_STORE)
    const updatedAt = new Date().toISOString()

    for (const item of entries) {
      const entry = makeIndexedDBSafe<OfflineCacheEntry<T>>({
        key: item.key,
        value: makeIndexedDBSafe(item.value),
        updatedAt,
      })
      store.put(entry)
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export const getOfflineCache = async <T>(key: string) => {
  if (!isOfflineStorageAvailable()) return null

  const entry = await runStore<OfflineCacheEntry<T> | undefined>(
    CACHE_STORE,
    'readonly',
    store => store.get(key),
  )

  return entry?.value ?? null
}

export const deleteOfflineCache = async (key: string) => {
  if (!isOfflineStorageAvailable()) return
  await runStore<undefined>(CACHE_STORE, 'readwrite', store => store.delete(key))
}

export const deleteOfflineCachesByPrefix = async (prefix: string) => {
  if (!isOfflineStorageAvailable()) return 0

  const db = await openDb()

  return await new Promise<number>((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE, 'readwrite')
    const store = transaction.objectStore(CACHE_STORE)
    const range = IDBKeyRange.bound(prefix, `${prefix}￿`)
    const request = store.openCursor(range)
    let removed = 0

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      cursor.delete()
      removed += 1
      cursor.continue()
    }

    transaction.oncomplete = () => resolve(removed)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
    request.onerror = () => reject(request.error)
  })
}

const clearObjectStore = async (storeName: string) => {
  if (!isOfflineStorageAvailable()) return
  await runStore<undefined>(storeName, 'readwrite', store => store.clear())
}

const USER_SCOPED_CACHE_PREFIXES = ['notas:', 'estoque:']

export const clearUserScopedOfflineData = async () => {
  if (!isOfflineStorageAvailable()) return

  for (const prefix of USER_SCOPED_CACHE_PREFIXES) {
    await deleteOfflineCachesByPrefix(prefix)
  }

  await clearObjectStore(QUEUE_STORE)
  await clearObjectStore(ID_MAPPING_STORE)

  notifyOfflineQueueChanged()
}

export const scanOfflineCacheByPrefix = async <T>(
  prefix: string,
  visitor: (entry: OfflineCacheEntry<T>, index: number) => false | void,
) => {
  if (!isOfflineStorageAvailable()) return 0

  const db = await openDb()

  return await new Promise<number>((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE, 'readonly')
    const store = transaction.objectStore(CACHE_STORE)
    const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`)
    const request = store.openCursor(range)
    let index = 0
    let stopped = false

    request.onsuccess = () => {
      if (stopped) return

      const cursor = request.result
      if (!cursor) {
        resolve(index)
        return
      }

      const shouldContinue = visitor(cursor.value as OfflineCacheEntry<T>, index)
      index += 1

      if (shouldContinue === false) {
        stopped = true
        resolve(index)
        return
      }

      cursor.continue()
    }

    request.onerror = () => reject(request.error)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export const enqueueOfflineRequest = async (
  entry: Omit<OfflineQueueEntry, 'id' | 'createdAt' | 'attempts'>,
) => {
  if (!isOfflineStorageAvailable()) return null

  const queued = makeIndexedDBSafe<OfflineQueueEntry>({
    id: `offline-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    ...entry,
    body: makeIndexedDBSafe(entry.body),
  })

  await runStore<IDBValidKey>(QUEUE_STORE, 'readwrite', store => store.put(queued))
  notifyOfflineQueueChanged()
  return queued
}

export const getOfflineQueue = async (entity?: OfflineQueueEntity) => {
  if (!isOfflineStorageAvailable()) return []

  const entries = await runStore<OfflineQueueEntry[]>(
    QUEUE_STORE,
    'readonly',
    store => store.getAll(),
  )

  return entries
    .filter(entry => !entity || entry.entity === entity)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export const getOfflineNotasQueue = () => getOfflineQueue('notas')

export const getOfflineQueueSummary = async (): Promise<OfflineQueueSummary> => {
  const entries = await getOfflineQueue()
  const byEntity: Record<OfflineQueueEntity, number> = {
    notas: 0,
    estoque: 0,
    auth: 0,
  }
  const byOperation: Record<OfflineQueueOperation, number> = {
    create: 0,
    update: 0,
    delete: 0,
    retirada: 0,
    status: 0,
    unknown: 0,
  }

  for (const entry of entries) {
    byEntity[entry.entity] += 1
    byOperation[entry.operation || 'unknown'] += 1
  }

  return {
    total: entries.length,
    failed: entries.filter(entry => entry.lastError).length,
    oldestCreatedAt: entries[0]?.createdAt ?? null,
    newestCreatedAt: entries[entries.length - 1]?.createdAt ?? null,
    byEntity,
    byOperation,
  }
}

export const getUnsyncedNotasCount = async () => {
  const summary = await getOfflineQueueSummary()
  return summary.byEntity.notas
}

const deleteQueueEntry = async (id: string) => {
  await runStore<undefined>(QUEUE_STORE, 'readwrite', store => store.delete(id))
  notifyOfflineQueueChanged()
}

const updateQueueEntry = async (entry: OfflineQueueEntry) => {
  await runStore<IDBValidKey>(QUEUE_STORE, 'readwrite', store => store.put(entry))
  notifyOfflineQueueChanged()
}

export const saveOfflineIdMapping = async (mapping: OfflineIdMapping) => {
  if (!isOfflineStorageAvailable()) return
  await runStore<IDBValidKey>(ID_MAPPING_STORE, 'readwrite', store => store.put(mapping))
}

export const getOfflineIdMapping = async (clientId: string) => {
  if (!isOfflineStorageAvailable()) return null

  const entry = await runStore<OfflineIdMapping | undefined>(
    ID_MAPPING_STORE,
    'readonly',
    store => store.get(clientId),
  )

  return entry ?? null
}

const resolveClientId = async (value: string) => {
  const mapping = await getOfflineIdMapping(value)
  return mapping?.serverId ?? value
}

const resolveQueuedEndpoint = async (endpoint: string) => {
  const clientIds = Array.from(new Set(endpoint.match(/offline-[a-z0-9-]+/gi) || []))
  let resolved = endpoint

  for (const clientId of clientIds) {
    const serverId = await resolveClientId(clientId)
    resolved = resolved.replaceAll(clientId, serverId)
  }

  return resolved
}

const resolveClientReferences = async (value: unknown): Promise<unknown> => {
  if (typeof value === 'string') {
    if (value.startsWith('offline-')) return await resolveClientId(value)
    return value
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map(item => resolveClientReferences(item)))
  }

  if (value && typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value as Record<string, unknown>)
        .map(async ([key, item]) => [key, await resolveClientReferences(item)] as const),
    )
    return Object.fromEntries(entries)
  }

  return value
}

const extractSyncedServerId = (entry: OfflineQueueEntry, response: any) => {
  if (entry.entity === 'notas') {
    return response?.nota?.id || response?.id || null
  }

  if (entry.entity === 'estoque') {
    return response?.produto?.id_produto || response?.id_produto || null
  }

  return null
}

const persistCreatedEntityMapping = async (entry: OfflineQueueEntry, response: any) => {
  if (!entry.clientId || entry.operation !== 'create') return

  const serverId = extractSyncedServerId(entry, response)
  if (!serverId) return

  await saveOfflineIdMapping({
    clientId: entry.clientId,
    serverId: String(serverId),
    entity: entry.entity,
    syncedAt: new Date().toISOString(),
  })
}

export const syncOfflineQueue = async (options: SyncOfflineQueueOptions = {}) => {
  if (!getOnlineStatus()) {
    return {
      synced: 0,
      failed: 0,
      pending: (await getOfflineQueue()).length,
    }
  }

  const entries = await getOfflineQueue()
  let synced = 0
  let failed = 0
  let processed = 0

  const notifyProgress = (currentEntry: OfflineQueueEntry | null) => {
    options.onProgress?.({
      total: entries.length,
      processed,
      synced,
      failed,
      pending: Math.max(0, entries.length - synced),
      currentEntry,
    })
  }

  notifyProgress(entries[0] || null)

  for (const entry of entries) {
    try {
      notifyProgress(entry)
      const response = await getApiFetch()(await resolveQueuedEndpoint(entry.endpoint), {
        method: entry.method,
        body: await resolveClientReferences(entry.body) as Record<string, any> | undefined,
      })

      await persistCreatedEntityMapping(entry, response)
      await deleteQueueEntry(entry.id)
      synced += 1
      processed += 1
      notifyProgress(entries[processed] || null)
    }
    catch (error) {
      failed += 1
      processed += 1
      await updateQueueEntry({
        ...entry,
        attempts: entry.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Falha ao sincronizar.',
      })
      notifyProgress(entry)
      break
    }
  }

  return { synced, failed, pending: (await getOfflineQueue()).length }
}
