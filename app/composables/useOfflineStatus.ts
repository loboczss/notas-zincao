import { computed, ref } from 'vue'
import {
  OFFLINE_QUEUE_CHANGED_EVENT,
  getOfflineNotasQueue,
  getOfflineQueue,
  getOfflineQueueSummary,
  getOnlineStatus,
  syncOfflineQueue,
  type OfflineQueueEntry,
  type OfflineQueueSummary,
} from '../utils/offline-db'

const isOnline = ref(true)
const pendingCount = ref(0)
const pendingNotasCount = ref(0)
const queueEntries = ref<OfflineQueueEntry[]>([])
const notasQueueEntries = ref<OfflineQueueEntry[]>([])
const summary = ref<OfflineQueueSummary>({
  total: 0,
  failed: 0,
  oldestCreatedAt: null,
  newestCreatedAt: null,
  byEntity: {
    notas: 0,
    estoque: 0,
    auth: 0,
  },
  byOperation: {
    create: 0,
    update: 0,
    delete: 0,
    retirada: 0,
    status: 0,
    unknown: 0,
  },
})
const syncing = ref(false)
const lastSyncAt = ref<string | null>(null)
let listenersBound = false

const refreshOfflineState = async () => {
  if (!import.meta.client) return

  isOnline.value = getOnlineStatus()
  const [entries, notasEntries, queueSummary] = await Promise.all([
    getOfflineQueue(),
    getOfflineNotasQueue(),
    getOfflineQueueSummary(),
  ])

  queueEntries.value = entries
  notasQueueEntries.value = notasEntries
  summary.value = queueSummary
  pendingCount.value = queueSummary.total
  pendingNotasCount.value = queueSummary.byEntity.notas
}

const ensureListeners = () => {
  if (!import.meta.client || listenersBound) return

  window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, refreshOfflineState)
  window.addEventListener('online', refreshOfflineState)
  window.addEventListener('offline', refreshOfflineState)
  listenersBound = true
}

export const useOfflineStatus = () => {
  ensureListeners()

  const syncNow = async () => {
    if (!import.meta.client || syncing.value || !getOnlineStatus()) {
      await refreshOfflineState()
      return { synced: 0, failed: 0, pending: pendingCount.value }
    }

    syncing.value = true
    try {
      const result = await syncOfflineQueue()
      lastSyncAt.value = new Date().toISOString()
      await refreshOfflineState()
      return result
    }
    finally {
      syncing.value = false
    }
  }

  return {
    isOnline: computed(() => isOnline.value),
    pendingCount: computed(() => pendingCount.value),
    pendingNotasCount: computed(() => pendingNotasCount.value),
    queueEntries: computed(() => queueEntries.value),
    notasQueueEntries: computed(() => notasQueueEntries.value),
    summary: computed(() => summary.value),
    syncing: computed(() => syncing.value),
    lastSyncAt: computed(() => lastSyncAt.value),
    refresh: refreshOfflineState,
    syncNow,
  }
}
