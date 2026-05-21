import { computed, ref } from 'vue'
import { getOfflineQueue, getOnlineStatus, syncOfflineQueue } from '../utils/offline-db'

const isOnline = ref(true)
const pendingCount = ref(0)
const syncing = ref(false)
const lastSyncAt = ref<string | null>(null)

export const useOfflineStatus = () => {
  const refresh = async () => {
    if (!import.meta.client) return

    isOnline.value = getOnlineStatus()
    pendingCount.value = (await getOfflineQueue()).length
  }

  const syncNow = async () => {
    if (!import.meta.client || syncing.value || !getOnlineStatus()) return { synced: 0, failed: 0 }

    syncing.value = true
    try {
      const result = await syncOfflineQueue()
      lastSyncAt.value = new Date().toISOString()
      await refresh()
      return result
    }
    finally {
      syncing.value = false
    }
  }

  return {
    isOnline: computed(() => isOnline.value),
    pendingCount: computed(() => pendingCount.value),
    syncing: computed(() => syncing.value),
    lastSyncAt: computed(() => lastSyncAt.value),
    refresh,
    syncNow,
  }
}
