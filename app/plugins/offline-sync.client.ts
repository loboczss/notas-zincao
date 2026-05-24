import { useOfflineStatus } from '../composables/useOfflineStatus'
import { useOfflineNotasSync } from '../composables/useOfflineNotasSync'
import { useToast } from '../composables/useToast'

const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000

export default defineNuxtPlugin(() => {
  const offline = useOfflineStatus()
  const notasSync = useOfflineNotasSync()
  const toast = useToast()
  let notasAutoSyncPromise: Promise<unknown> | null = null
  let intervalHandle: ReturnType<typeof setInterval> | null = null

  const syncNotasIfNeeded = async () => {
    if (notasAutoSyncPromise || !navigator.onLine) return

    notasAutoSyncPromise = notasSync
      .autoSyncIfNeeded()
      .catch((error) => {
        console.warn('[offline-sync] notes sync failed', error)
      })
      .finally(() => {
        notasAutoSyncPromise = null
      })

    await notasAutoSyncPromise
  }

  const refreshAndSync = async (notify = true) => {
    await offline.refresh()

    if (navigator.onLine) {
      const result = await offline.syncNow()
      await syncNotasIfNeeded()
      if (notify && result.synced > 0) {
        toast.success(`${result.synced} alteracao(oes) offline sincronizada(s).`)
      }
      if (notify && result.failed > 0) {
        toast.error(`${result.failed} alteracao(oes) offline nao puderam ser sincronizadas.`)
      }
      return
    }

    if (notify) {
      toast.warning('Voce esta offline. As alteracoes serao salvas no aparelho.')
    }
  }

  const stopInterval = () => {
    if (intervalHandle !== null) {
      clearInterval(intervalHandle)
      intervalHandle = null
    }
  }

  const startInterval = () => {
    if (intervalHandle !== null) return
    intervalHandle = setInterval(() => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      void refreshAndSync(false)
    }, AUTO_SYNC_INTERVAL_MS)
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void refreshAndSync(false)
      startInterval()
    }
    else {
      stopInterval()
    }
  }

  window.addEventListener('online', () => refreshAndSync())
  window.addEventListener('offline', () => refreshAndSync())
  window.addEventListener('focus', () => refreshAndSync(false))
  document.addEventListener('visibilitychange', handleVisibilityChange)

  refreshAndSync(false)
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    startInterval()
  }
})
