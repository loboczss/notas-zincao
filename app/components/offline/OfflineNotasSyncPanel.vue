<script setup lang="ts">
import { computed } from 'vue'
import { CloudDownload, Database, ShieldCheck, Wifi, WifiOff } from 'lucide-vue-next'
import type { OfflineNotasSyncPhase } from '../../composables/useOfflineNotasSync'
import type { OfflineNotasSyncMeta } from '../../utils/offline-notas-sync'

const props = defineProps<{
  isOnline: boolean
  running: boolean
  phase: OfflineNotasSyncPhase
  permissionLabel: string
  activeNotes: number
  deletedNotes: number
  pendingQueueItems: number
  lastMeta: OfflineNotasSyncMeta | null
}>()

const emit = defineEmits<{
  (event: 'sync-all'): void
}>()

const phaseLabel = computed(() => {
  if (!props.isOnline) return 'Offline'
  if (props.phase === 'uploading') return 'Enviando fila'
  if (props.phase === 'downloading') return 'Baixando notas'
  if (props.phase === 'saving') return 'Salvando no aparelho'
  if (props.phase === 'done') return 'Sincronizado'
  if (props.phase === 'error') return 'Atencao'
  return 'Pronto'
})

const lastSyncLabel = computed(() => {
  const value = props.lastMeta?.lastCompletedAt
  if (!value) return 'Sem sincronizacao completa'
  return new Date(value).toLocaleString('pt-BR')
})
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold"
            :class="props.isOnline ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
          >
            <Wifi v-if="props.isOnline" class="h-3.5 w-3.5" />
            <WifiOff v-else class="h-3.5 w-3.5" />
            {{ phaseLabel }}
          </span>

          <span class="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ShieldCheck class="h-3.5 w-3.5" />
            {{ props.permissionLabel }}
          </span>
        </div>

        <h2 class="mt-3 text-lg font-bold text-slate-950 dark:text-white">
          Sincronizacao completa das notas
        </h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {{ lastSyncLabel }}
        </p>

      </div>

      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-bold text-white transition hover:bg-brand-500 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="props.running || !props.isOnline"
        @click="emit('sync-all')"
      >
        <CloudDownload class="h-4 w-4" :class="{ 'animate-bounce': props.running }" />
        <span>{{ props.running ? 'Sincronizando' : 'Sincronizar tudo' }}</span>
      </button>
    </div>

    <div class="mt-4 grid grid-cols-3 gap-3">
      <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
        <div class="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Database class="h-3.5 w-3.5" />
          Baixadas
        </div>
        <p class="mt-1 text-xl font-bold text-slate-950 dark:text-white">
          {{ props.activeNotes }}
        </p>
      </div>

      <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
        <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
          Lixeira
        </div>
        <p class="mt-1 text-xl font-bold text-slate-950 dark:text-white">
          {{ props.deletedNotes }}
        </p>
      </div>

      <div class="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
        <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
          Fila
        </div>
        <p class="mt-1 text-xl font-bold text-slate-950 dark:text-white">
          {{ props.pendingQueueItems }}
        </p>
      </div>
    </div>
  </section>
</template>
