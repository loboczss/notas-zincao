import { useOfflineStatus } from '../composables/useOfflineStatus'
import { useOfflineNotasSync } from '../composables/useOfflineNotasSync'
import { useToast } from '../composables/useToast'

export default defineNuxtPlugin(() => {
  const offline = useOfflineStatus()
  const notasSync = useOfflineNotasSync()
  const toast = useToast()
  let notasAutoSyncPromise: Promise<unknown> | null = null

  const syncNotasIfNeeded = async () => {
    if (notasAutoSyncPromise || !navigator.onLine) return

    notasAutoSyncPromise = notasSync
      .autoSyncIfNeeded()
      .catch((error) => {
        console.warn('[offline-sync] full notes sync failed', error)
      })
      .finally(() => {
        notasAutoSyncPromise = null
      })

    await notasAutoSyncPromise
  }

  const refreshAndSync = async () => {
    await offline.refresh()

    if (navigator.onLine) {
      const result = await offline.syncNow()
      await syncNotasIfNeeded()
      if (result.synced > 0) {
        toast.success(`${result.synced} alteracao(oes) offline sincronizada(s).`)
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} alteracao(oes) offline nao puderam ser sincronizadas.`)
      }
      return
    }

    toast.warning('Voce esta offline. As alteracoes serao salvas no aparelho.')
  }

  window.addEventListener('online', refreshAndSync)
  window.addEventListener('offline', refreshAndSync)
  window.addEventListener('focus', refreshAndSync)

  refreshAndSync()
})
