import { computed, ref } from 'vue'
import {
  OFFLINE_QUEUE_CHANGED_EVENT,
  getOfflineNotasQueue,
  getOnlineStatus,
  removeOfflineQueueEntry,
  syncOfflineQueue,
  type OfflineQueueEntry,
  type OfflineQueueOperation,
} from '../utils/offline-db'
import { useNotasStore } from '../stores'

export type NotaQueueJobStatus = 'pendente' | 'enviando' | 'concluida' | 'falhou'

export type NotaQueueJob = {
  id: string
  label: string
  status: NotaQueueJobStatus
  error: string | null
  entityId: string | null
  operation: OfflineQueueOperation
}

// Estado singleton (módulo) — o painel flutuante e o store compartilham a mesma fila.
const jobs = ref<NotaQueueJob[]>([])
const running = ref(false)
const activeEntryId = ref<string | null>(null)
let pendingRerun = false
let listenersBound = false
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()

const CONCLUDED_AUTO_DISMISS_MS = 6000

const jobLabel = (entry: OfflineQueueEntry) => {
  return entry.description || 'Nota'
}

const upsertJob = (entry: OfflineQueueEntry, patch: Partial<NotaQueueJob> = {}) => {
  const index = jobs.value.findIndex(job => job.id === entry.id)
  const base: NotaQueueJob = {
    id: entry.id,
    label: jobLabel(entry),
    status: entry.lastError ? 'falhou' : 'pendente',
    error: entry.lastError || null,
    entityId: entry.entityId || null,
    operation: entry.operation || 'unknown',
  }

  const next: NotaQueueJob = index >= 0
    ? { ...(jobs.value[index] as NotaQueueJob), ...base, ...patch }
    : { ...base, ...patch }

  if (index >= 0) {
    jobs.value[index] = next
    jobs.value = [...jobs.value]
  }
  else {
    jobs.value = [next, ...jobs.value]
  }
  return next
}

const setJob = (id: string, patch: Partial<NotaQueueJob>) => {
  const index = jobs.value.findIndex(job => job.id === id)
  if (index < 0) return
  jobs.value[index] = { ...(jobs.value[index] as NotaQueueJob), ...patch }
  jobs.value = [...jobs.value]
}

const scheduleDismiss = (id: string) => {
  const existing = dismissTimers.get(id)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    dismissTimers.delete(id)
    jobs.value = jobs.value.filter(job => job.id !== id)
  }, CONCLUDED_AUTO_DISMISS_MS)
  dismissTimers.set(id, timer)
}

// Sincroniza a lista de jobs com o que ainda está na fila (itens pendentes/falhos).
const syncJobsFromQueue = async () => {
  const entries = await getOfflineNotasQueue()
  const byId = new Map(entries.map(entry => [entry.id, entry]))

  // Atualiza/insere jobs para itens que ainda estão na fila.
  for (const entry of entries) {
    upsertJob(entry, {
      status: entry.lastError ? 'falhou' : (activeEntryId.value === entry.id ? 'enviando' : 'pendente'),
      error: entry.lastError || null,
    })
  }

  // Itens que sumiram da fila e não estavam falhos = concluídos.
  for (const job of jobs.value) {
    if (byId.has(job.id)) continue
    if (job.status === 'concluida' || job.status === 'falhou') continue
    setJob(job.id, { status: 'concluida', error: null })
    scheduleDismiss(job.id)
  }

  return entries
}

const reconcileFailure = (job: NotaQueueJob) => {
  // Falha real do servidor (ex.: "sem baixa") — recarrega o detalhe para corrigir
  // o saldo otimista aplicado localmente e evitar "retirada fantasma".
  if (!job.entityId) return
  if (job.operation !== 'retirada') return

  const store = useNotasStore()
  void store.fetchNotaDetalhe(job.entityId).catch(() => {
    // silencioso — a falha já está visível no painel
  })
}

const runDrainOnce = async () => {
  await syncJobsFromQueue()

  await syncOfflineQueue({
    entity: 'notas',
    continueOnError: true,
    onProgress: (progress) => {
      const current = progress.currentEntry
      if (current && current.entity === 'notas') {
        activeEntryId.value = current.id
        upsertJob(current, {
          status: current.lastError ? 'falhou' : 'enviando',
          error: current.lastError || null,
        })
      }
    },
  })

  activeEntryId.value = null

  // Diff pós-drenagem: quem saiu da fila concluiu; quem ficou com lastError falhou.
  const remaining = await getOfflineNotasQueue()
  const remainingById = new Map(remaining.map(entry => [entry.id, entry]))

  for (const job of [...jobs.value]) {
    const entry = remainingById.get(job.id)
    if (!entry) {
      if (job.status !== 'concluida') {
        setJob(job.id, { status: 'concluida', error: null })
        scheduleDismiss(job.id)
      }
      continue
    }

    if (entry.lastError) {
      const wasFailed = job.status === 'falhou'
      setJob(job.id, { status: 'falhou', error: entry.lastError })
      if (!wasFailed) reconcileFailure({ ...job, status: 'falhou', error: entry.lastError })
    }
  }
}

/** Drena a fila de notas em segundo plano (não bloqueia a UI). */
export const processNotasQueueInBackground = () => {
  if (!import.meta.client) return
  if (!getOnlineStatus()) return

  if (running.value) {
    pendingRerun = true
    return
  }

  void (async () => {
    running.value = true
    try {
      do {
        pendingRerun = false
        await runDrainOnce()
      } while (pendingRerun && getOnlineStatus())
    }
    catch (error) {
      console.warn('[notas-bg-queue] drain falhou', error)
    }
    finally {
      running.value = false
    }
  })()
}

const ensureListeners = () => {
  if (!import.meta.client || listenersBound) return
  window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, () => {
    void syncJobsFromQueue()
  })
  window.addEventListener('online', () => processNotasQueueInBackground())
  listenersBound = true
}

export const useNotasBackgroundQueue = () => {
  ensureListeners()

  const retryAll = () => {
    processNotasQueueInBackground()
  }

  const dismissJob = async (id: string) => {
    const timer = dismissTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      dismissTimers.delete(id)
    }
    jobs.value = jobs.value.filter(job => job.id !== id)
    await removeOfflineQueueEntry(id)
  }

  const visibleJobs = computed(() => jobs.value)
  const activeJobs = computed(() => jobs.value.filter(job => job.status === 'enviando' || job.status === 'pendente'))
  const failedJobs = computed(() => jobs.value.filter(job => job.status === 'falhou'))
  const hasJobs = computed(() => jobs.value.length > 0)

  return {
    jobs: visibleJobs,
    activeJobs,
    failedJobs,
    hasJobs,
    running: computed(() => running.value),
    processNotasQueueInBackground,
    retryAll,
    dismissJob,
    syncJobsFromQueue,
  }
}
