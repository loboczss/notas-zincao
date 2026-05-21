import { $fetch } from 'ofetch'

export type OfflineRequestMethod = 'POST' | 'PATCH' | 'DELETE'

export type OfflineQueueEntry = {
  id: string
  endpoint: string
  method: OfflineRequestMethod
  body?: unknown
  entity: 'notas' | 'estoque' | 'auth'
  description: string
  createdAt: string
  attempts: number
  lastError?: string
}

type CacheEntry<T = unknown> = {
  key: string
  value: T
  updatedAt: string
}

const DB_NAME = 'notas-zincao-offline'
const DB_VERSION = 1
const CACHE_STORE = 'cache'
const QUEUE_STORE = 'queue'

let dbPromise: Promise<IDBDatabase> | null = null

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

export const setOfflineCache = async <T>(key: string, value: T) => {
  if (!isOfflineStorageAvailable()) return

  const entry: CacheEntry<T> = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  }

  await runStore<IDBValidKey>(CACHE_STORE, 'readwrite', store => store.put(entry))
}

export const getOfflineCache = async <T>(key: string) => {
  if (!isOfflineStorageAvailable()) return null

  const entry = await runStore<CacheEntry<T> | undefined>(
    CACHE_STORE,
    'readonly',
    store => store.get(key),
  )

  return entry?.value ?? null
}

export const enqueueOfflineRequest = async (
  entry: Omit<OfflineQueueEntry, 'id' | 'createdAt' | 'attempts'>,
) => {
  if (!isOfflineStorageAvailable()) return null

  const queued: OfflineQueueEntry = {
    id: `offline-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    ...entry,
  }

  await runStore<IDBValidKey>(QUEUE_STORE, 'readwrite', store => store.put(queued))
  return queued
}

export const getOfflineQueue = async () => {
  if (!isOfflineStorageAvailable()) return []

  const entries = await runStore<OfflineQueueEntry[]>(
    QUEUE_STORE,
    'readonly',
    store => store.getAll(),
  )

  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

const deleteQueueEntry = async (id: string) => {
  await runStore<undefined>(QUEUE_STORE, 'readwrite', store => store.delete(id))
}

const updateQueueEntry = async (entry: OfflineQueueEntry) => {
  await runStore<IDBValidKey>(QUEUE_STORE, 'readwrite', store => store.put(entry))
}

export const syncOfflineQueue = async () => {
  if (!getOnlineStatus()) return { synced: 0, failed: 0 }

  const entries = await getOfflineQueue()
  let synced = 0
  let failed = 0

  for (const entry of entries) {
    try {
      await $fetch(entry.endpoint, {
        method: entry.method,
        body: entry.body as Record<string, any> | undefined,
      })

      await deleteQueueEntry(entry.id)
      synced += 1
    }
    catch (error) {
      failed += 1
      await updateQueueEntry({
        ...entry,
        attempts: entry.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Falha ao sincronizar.',
      })
      break
    }
  }

  return { synced, failed }
}
