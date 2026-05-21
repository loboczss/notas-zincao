<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import AppPageShell from '../components/layout/AppPageShell.vue'
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger.vue'
import OfflineQueueList from '../components/offline/OfflineQueueList.vue'
import OfflineNotasSyncNoteList from '../components/offline/OfflineNotasSyncNoteList.vue'
import OfflineNotasSyncPanel from '../components/offline/OfflineNotasSyncPanel.vue'
import OfflineNotasSyncProgress from '../components/offline/OfflineNotasSyncProgress.vue'
import OfflineSummaryCards from '../components/offline/OfflineSummaryCards.vue'
import { useOfflineNotasSync } from '../composables/useOfflineNotasSync'
import { useOfflineStatus } from '../composables/useOfflineStatus'
import { useToast } from '../composables/useToast'

definePageMeta({
  middleware: 'auth',
})

const offline = useOfflineStatus()
const notasSync = useOfflineNotasSync()
const { success: showSuccess, error: showError } = useToast()
const queuePageSize = 12
const visibleQueueLimit = ref(queuePageSize)
const loadingMoreQueue = ref(false)

const visibleQueueEntries = computed(() => {
  return offline.queueEntries.value.slice(0, visibleQueueLimit.value)
})

const hasMoreQueueEntries = computed(() => {
  return visibleQueueEntries.value.length < offline.queueEntries.value.length
})

const syncNow = async (options: { silent?: boolean } = {}) => {
  try {
    await notasSync.syncAllNotas()
    await offline.refresh()
    if (!options.silent) {
      showSuccess('Sincronizacao completa concluida.')
    }
  }
  catch (error) {
    showError(error instanceof Error ? error.message : 'Falha ao sincronizar notas.')
  }
}

const loadMoreQueueEntries = async () => {
  if (loadingMoreQueue.value || !hasMoreQueueEntries.value) return

  loadingMoreQueue.value = true
  await nextTick()
  visibleQueueLimit.value += queuePageSize
  await nextTick()
  loadingMoreQueue.value = false
}

watch(
  () => offline.queueEntries.value.length,
  () => {
    visibleQueueLimit.value = queuePageSize
  },
)

onMounted(async () => {
  await Promise.all([
    offline.refresh(),
    notasSync.refreshLocalSnapshot(),
  ])

  if (offline.isOnline.value && !notasSync.lastMeta.value?.lastCompletedAt) {
    await syncNow({ silent: true })
  }
})
</script>

<template>
  <AppPageShell
    eyebrow="Offline"
    title="Sincronizacao"
    description="Acompanhe notas, retiradas e alteracoes salvas no aparelho aguardando envio."
  >
    <template #headerAside>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-brand-500 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="notasSync.running.value || !offline.isOnline.value"
        @click="() => syncNow()"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': notasSync.running.value }" />
        <span>Sincronizar tudo</span>
      </button>
    </template>

    <div class="space-y-5">
      <OfflineNotasSyncPanel
        :is-online="offline.isOnline.value"
        :running="notasSync.running.value"
        :phase="notasSync.phase.value"
        :permission-label="notasSync.permissionLabel.value"
        :active-notes="notasSync.localSnapshot.value.activeNotes"
        :deleted-notes="notasSync.localSnapshot.value.deletedNotes"
        :pending-queue-items="offline.pendingCount.value"
        :last-meta="notasSync.lastMeta.value"
        :error-message="notasSync.errorMessage.value"
        @sync-all="() => syncNow()"
      />

      <OfflineNotasSyncProgress
        :upload="notasSync.upload.value"
        :download="notasSync.download.value"
        :upload-percent="notasSync.uploadPercent.value"
        :note-percent="notasSync.notePercent.value"
        :asset-percent="notasSync.assetPercent.value"
      />

      <OfflineNotasSyncNoteList
        v-if="notasSync.running.value || notasSync.notes.value.length"
        :notes="notasSync.notes.value"
        :running="notasSync.running.value"
      />

      <OfflineSummaryCards
        :summary="offline.summary.value"
        :is-online="offline.isOnline.value"
        :syncing="offline.syncing.value || notasSync.running.value"
      />

      <OfflineQueueList
        :entries="visibleQueueEntries"
        :total-entries="offline.queueEntries.value.length"
        :syncing="offline.syncing.value || notasSync.running.value"
      />

      <InfiniteScrollTrigger
        v-if="offline.queueEntries.value.length"
        :loading="loadingMoreQueue"
        :done="!hasMoreQueueEntries"
        :disabled="offline.syncing.value || notasSync.running.value"
        :loaded-count="visibleQueueEntries.length"
        :total="offline.queueEntries.value.length"
        label="operacoes"
        done-label="Toda a fila de sincronizacao foi carregada."
        @load-more="loadMoreQueueEntries"
      />
    </div>
  </AppPageShell>
</template>
