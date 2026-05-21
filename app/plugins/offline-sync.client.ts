import { useOfflineStatus } from '../composables/useOfflineStatus'
import { useToast } from '../composables/useToast'

export default defineNuxtPlugin(() => {
  const offline = useOfflineStatus()
  const toast = useToast()

  const refreshAndSync = async () => {
    await offline.refresh()

    if (navigator.onLine) {
      const result = await offline.syncNow()
      if (result.synced > 0) {
        toast.success(`${result.synced} alteracao(oes) offline sincronizada(s).`)
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
