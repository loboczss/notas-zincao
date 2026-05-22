import { computed, ref } from 'vue'
import type { OfflineNotaSyncItem, OfflineNotasSyncPermissions } from '../../shared/types/OfflineNotasSync'
import {
  getOfflineNotasLocalSnapshot,
  syncOfflineNotasCompleto,
  type OfflineNotasLocalSnapshot,
  type OfflineNotasSyncMeta,
  type OfflineNotasSyncProgressEvent,
  type OfflineNotasSyncSummary,
} from '../utils/offline-notas-sync'
import { getApiErrorMessage } from '../utils/api-errors'
import { getOnlineStatus } from '../utils/offline-db'
import { useToast } from './useToast'

export type OfflineNotasSyncPhase =
  | 'idle'
  | 'uploading'
  | 'downloading'
  | 'saving'
  | 'done'
  | 'error'

export type OfflineNotaSyncNoteProgress = {
  id: string
  label: string
  status: 'waiting' | 'saving' | 'saved' | 'deleted' | 'failed'
  assetCount: number
  assetsProcessed: number
  assetsFailed: number
  lastAssetLabel: string | null
  error: string | null
}

const running = ref(false)
const phase = ref<OfflineNotasSyncPhase>('idle')
const errorMessage = ref('')
const startedAt = ref<string | null>(null)
const finishedAt = ref<string | null>(null)
const permissions = ref<OfflineNotasSyncPermissions | null>(null)
const summary = ref<OfflineNotasSyncSummary | null>(null)
const localSnapshot = ref<OfflineNotasLocalSnapshot>({
  activeNotes: 0,
  retiradaNotes: 0,
  deletedNotes: 0,
  pendingQueueItems: 0,
  meta: null,
})
const upload = ref({
  total: 0,
  processed: 0,
  synced: 0,
  failed: 0,
  pending: 0,
  currentDescription: '',
})
const download = ref({
  page: 0,
  totalPages: 0,
  totalCloudNotes: 0,
  completedBeforePage: 0,
  returnedNotes: 0,
  remainingAfterPage: 0,
  processedNotes: 0,
  discoveredAssets: 0,
  downloadedAssets: 0,
  cachedAssets: 0,
  failedAssets: 0,
})
const notes = ref<OfflineNotaSyncNoteProgress[]>([])
const lastAutoAttemptAt = ref(0)

const AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000

const resetRunState = () => {
  phase.value = 'idle'
  errorMessage.value = ''
  startedAt.value = null
  finishedAt.value = null
  permissions.value = null
  summary.value = null
  upload.value = {
    total: 0,
    processed: 0,
    synced: 0,
    failed: 0,
    pending: 0,
    currentDescription: '',
  }
  download.value = {
    page: 0,
    totalPages: 0,
    totalCloudNotes: 0,
    completedBeforePage: 0,
    returnedNotes: 0,
    remainingAfterPage: 0,
    processedNotes: 0,
    discoveredAssets: 0,
    downloadedAssets: 0,
    cachedAssets: 0,
    failedAssets: 0,
  }
  notes.value = []
}

const noteLabel = (note: OfflineNotaSyncItem) => {
  const numero = String(note.data.numero_nota || '').trim()
  const cliente = String(note.data.nome_cliente || '').trim()
  return [numero ? `Nota ${numero}` : 'Nota', cliente].filter(Boolean).join(' - ')
}

const upsertNote = (
  id: string,
  patch: Partial<Omit<OfflineNotaSyncNoteProgress, 'id'>>,
) => {
  const index = notes.value.findIndex(note => note.id === id)
  if (index >= 0) {
    const current = notes.value[index] as OfflineNotaSyncNoteProgress
    const updated: OfflineNotaSyncNoteProgress = {
      id: current.id,
      label: patch.label ?? current.label,
      status: patch.status ?? current.status,
      assetCount: patch.assetCount ?? current.assetCount,
      assetsProcessed: patch.assetsProcessed ?? current.assetsProcessed,
      assetsFailed: patch.assetsFailed ?? current.assetsFailed,
      lastAssetLabel: patch.lastAssetLabel ?? current.lastAssetLabel,
      error: patch.error ?? current.error,
    }
    notes.value[index] = updated
    notes.value = [...notes.value]
    return updated
  }

  const created: OfflineNotaSyncNoteProgress = {
    id,
    label: patch.label || 'Nota',
    status: patch.status || 'waiting',
    assetCount: patch.assetCount || 0,
    assetsProcessed: patch.assetsProcessed || 0,
    assetsFailed: patch.assetsFailed || 0,
    lastAssetLabel: patch.lastAssetLabel || null,
    error: patch.error || null,
  }
  notes.value = [created, ...notes.value].slice(0, 20)
  return created
}

const applyProgress = (event: OfflineNotasSyncProgressEvent) => {
  if (event.stage === 'upload') {
    phase.value = event.upload.total > 0 ? 'uploading' : phase.value
    upload.value = {
      total: event.upload.total,
      processed: event.upload.processed,
      synced: event.upload.synced,
      failed: event.upload.failed,
      pending: event.upload.pending,
      currentDescription: event.upload.currentEntry?.description || '',
    }
    return
  }

  if (event.stage === 'page') {
    phase.value = 'downloading'
    permissions.value = event.permissions
    download.value = {
      ...download.value,
      page: event.page,
      totalPages: event.totalPages,
      totalCloudNotes: event.totalCloudNotes,
      completedBeforePage: event.completedBeforePage,
      returnedNotes: event.returnedNotes,
      remainingAfterPage: event.remainingAfterPage,
    }
    return
  }

  if (event.stage === 'note') {
    phase.value = event.status === 'saving' ? 'saving' : 'downloading'
    download.value = {
      ...download.value,
      processedNotes: event.processedNotes,
      totalCloudNotes: event.totalCloudNotes,
    }
    upsertNote(event.note.id, {
      label: noteLabel(event.note),
      status: event.status,
      assetCount: event.note.asset_count,
    })
    return
  }

  if (event.stage === 'asset') {
    download.value = {
      ...download.value,
      discoveredAssets: event.discoveredAssets,
      downloadedAssets: event.downloadedAssets,
      cachedAssets: event.cachedAssets,
      failedAssets: event.failedAssets,
    }

    const note = upsertNote(event.note.id, {
      label: noteLabel(event.note),
      assetCount: event.note.asset_count,
      lastAssetLabel: event.asset.kind,
    })
    const processed = Math.min(note.assetCount, note.assetsProcessed + 1)
    upsertNote(event.note.id, {
      assetsProcessed: processed,
      assetsFailed: event.status === 'failed' ? note.assetsFailed + 1 : note.assetsFailed,
      status: event.status === 'failed' ? 'failed' : note.status,
      error: event.error || note.error,
    })
    return
  }

  if (event.stage === 'done') {
    phase.value = 'done'
    summary.value = event.summary
    permissions.value = event.summary.permissions
    finishedAt.value = event.summary.lastCompletedAt
  }
}

const refreshLocalSnapshot = async () => {
  if (!import.meta.client) return localSnapshot.value
  localSnapshot.value = await getOfflineNotasLocalSnapshot()
  return localSnapshot.value
}

type SyncAllNotasOptions = {
  automatic?: boolean
}

const syncAllNotas = async (_options: SyncAllNotasOptions = {}) => {
  void _options
  if (running.value) return summary.value

  resetRunState()
  running.value = true
  phase.value = 'uploading'
  startedAt.value = new Date().toISOString()

  try {
    const result = await syncOfflineNotasCompleto({
      includeDeleted: true,
      onProgress: applyProgress,
    })
    summary.value = result
    phase.value = 'done'
    finishedAt.value = result.lastCompletedAt
    await refreshLocalSnapshot()
    return result
  }
  catch (error) {
    phase.value = 'error'
    errorMessage.value = getApiErrorMessage(error, 'Falha ao sincronizar notas.')
    useToast().error(errorMessage.value)
    throw error
  }
  finally {
    running.value = false
  }
}

const autoSyncIfNeeded = async (options: { force?: boolean } = {}) => {
  if (!import.meta.client || running.value || !getOnlineStatus()) return summary.value

  await refreshLocalSnapshot()
  const hasCompletedSync = Boolean(localSnapshot.value.meta?.lastCompletedAt)
  const now = Date.now()

  if (!options.force && hasCompletedSync) return localSnapshot.value.meta
  if (!options.force && now - lastAutoAttemptAt.value < AUTO_SYNC_COOLDOWN_MS) {
    return summary.value || localSnapshot.value.meta
  }

  lastAutoAttemptAt.value = now
  try {
    return await syncAllNotas({ automatic: true })
  }
  catch (error) {
    lastAutoAttemptAt.value = 0
    throw error
  }
}

export const useOfflineNotasSync = () => {
  const notePercent = computed(() => {
    if (!download.value.totalCloudNotes) return 0
    return Math.min(100, Math.round((download.value.processedNotes / download.value.totalCloudNotes) * 100))
  })

  const assetPercent = computed(() => {
    if (!download.value.discoveredAssets) return 0
    const done = download.value.downloadedAssets + download.value.cachedAssets + download.value.failedAssets
    return Math.min(100, Math.round((done / download.value.discoveredAssets) * 100))
  })

  const uploadPercent = computed(() => {
    if (!upload.value.total) return 100
    return Math.min(100, Math.round((upload.value.synced / upload.value.total) * 100))
  })

  const permissionLabel = computed(() => {
    const scope = permissions.value?.scope || localSnapshot.value.meta?.permissions?.scope
    if (scope === 'all') return 'Admin/colaborador: notas de todos'
    if (scope === 'own') return 'Vendedor: somente suas notas'
    return 'Permissao sera confirmada na sincronizacao'
  })

  const lastMeta = computed<OfflineNotasSyncMeta | null>(() => {
    return summary.value || localSnapshot.value.meta
  })

  return {
    running: computed(() => running.value),
    phase: computed(() => phase.value),
    errorMessage: computed(() => errorMessage.value),
    startedAt: computed(() => startedAt.value),
    finishedAt: computed(() => finishedAt.value),
    permissions: computed(() => permissions.value),
    summary: computed(() => summary.value),
    localSnapshot: computed(() => localSnapshot.value),
    lastMeta,
    upload: computed(() => upload.value),
    download: computed(() => download.value),
    notes: computed(() => notes.value),
    notePercent,
    assetPercent,
    uploadPercent,
    permissionLabel,
    refreshLocalSnapshot,
    syncAllNotas,
    autoSyncIfNeeded,
  }
}
