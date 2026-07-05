<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, RotateCw, X } from 'lucide-vue-next'
import { useNotasBackgroundQueue, type NotaQueueJob } from '../../composables/useNotasBackgroundQueue'

const queue = useNotasBackgroundQueue()
const jobs = queue.jobs
const running = queue.running

const hasVisible = computed(() => jobs.value.length > 0)
const failedCount = computed(() => jobs.value.filter(job => job.status === 'falhou').length)
const activeCount = computed(() => jobs.value.filter(job => job.status === 'enviando' || job.status === 'pendente').length)

const statusLabel = (job: NotaQueueJob) => {
  if (job.status === 'concluida') return 'Concluída'
  if (job.status === 'falhou') return 'Falhou'
  if (job.status === 'enviando') return 'Enviando...'
  return 'Na fila'
}

const headerLabel = computed(() => {
  if (activeCount.value > 0) return `Enviando ${activeCount.value} nota${activeCount.value === 1 ? '' : 's'}...`
  if (failedCount.value > 0) return `${failedCount.value} envio${failedCount.value === 1 ? '' : 's'} com falha`
  return 'Envios concluídos'
})
</script>

<template>
  <div
    v-if="hasVisible"
    class="fixed bottom-24 right-4 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 md:bottom-4"
  >
    <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
      <div class="flex min-w-0 items-center gap-2">
        <LoaderCircle v-if="running" class="h-4 w-4 shrink-0 animate-spin text-brand-600" />
        <CheckCircle2 v-else-if="failedCount === 0" class="h-4 w-4 shrink-0 text-emerald-600" />
        <AlertTriangle v-else class="h-4 w-4 shrink-0 text-amber-600" />
        <p class="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
          {{ headerLabel }}
        </p>
      </div>
      <button
        v-if="failedCount > 0"
        type="button"
        class="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
        @click="queue.retryAll"
      >
        <RotateCw class="h-3 w-3" />
        Reprocessar
      </button>
    </div>

    <ul class="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
      <li
        v-for="job in jobs"
        :key="job.id"
        class="flex items-start gap-2 px-3 py-2"
      >
        <span class="mt-0.5 shrink-0">
          <LoaderCircle v-if="job.status === 'enviando'" class="h-4 w-4 animate-spin text-brand-600" />
          <Clock3 v-else-if="job.status === 'pendente'" class="h-4 w-4 text-slate-400" />
          <CheckCircle2 v-else-if="job.status === 'concluida'" class="h-4 w-4 text-emerald-600" />
          <AlertTriangle v-else class="h-4 w-4 text-rose-600" />
        </span>

        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
            {{ job.label }}
          </p>
          <p
            class="text-[11px] font-semibold"
            :class="{
              'text-slate-500 dark:text-slate-400': job.status === 'pendente' || job.status === 'enviando',
              'text-emerald-600 dark:text-emerald-400': job.status === 'concluida',
              'text-rose-600 dark:text-rose-400': job.status === 'falhou',
            }"
          >
            {{ statusLabel(job) }}
          </p>
          <p v-if="job.status === 'falhou' && job.error" class="mt-0.5 line-clamp-2 text-[11px] text-rose-500 dark:text-rose-400">
            {{ job.error }}
          </p>
        </div>

        <button
          v-if="job.status === 'falhou'"
          type="button"
          class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          aria-label="Descartar"
          @click="queue.dismissJob(job.id)"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </li>
    </ul>
  </div>
</template>
