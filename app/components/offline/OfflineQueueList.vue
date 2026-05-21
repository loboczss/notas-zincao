<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Clock3, FileText, Package, RefreshCw } from 'lucide-vue-next'
import { computed, type Component } from 'vue'
import type { OfflineQueueEntry, OfflineQueueEntity, OfflineQueueOperation } from '../../utils/offline-db'

const props = defineProps<{
  entries: OfflineQueueEntry[]
  syncing?: boolean
  totalEntries?: number
}>()

const entityLabels: Record<OfflineQueueEntity, string> = {
  notas: 'Notas',
  estoque: 'Estoque',
  auth: 'Conta',
}

const operationLabels: Record<OfflineQueueOperation, string> = {
  create: 'Cadastro',
  update: 'Atualizacao',
  delete: 'Exclusao',
  retirada: 'Retirada',
  status: 'Status',
  unknown: 'Operacao',
}

const entityIcon = (entity: OfflineQueueEntity): Component => {
  if (entity === 'estoque') return Package
  return FileText
}

const formatDateTime = (value: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

const operationLabel = (entry: OfflineQueueEntry) => operationLabels[entry.operation || 'unknown']

const totalEntries = computed(() => props.totalEntries ?? props.entries.length)

const methodClass = (method: string) => {
  if (method === 'POST') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
  if (method === 'PATCH') return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
  if (method === 'DELETE') return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <div>
        <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100">
          Fila de sincronizacao
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ props.entries.length }} de {{ totalEntries }} operacao{{ totalEntries === 1 ? '' : 'es' }} aguardando envio.
        </p>
      </div>
      <RefreshCw v-if="props.syncing" class="h-4 w-4 animate-spin text-brand-600" />
      <CheckCircle2 v-else-if="!props.entries.length" class="h-4 w-4 text-emerald-500" />
      <Clock3 v-else class="h-4 w-4 text-slate-400" />
    </div>

    <div v-if="!props.entries.length" class="flex min-h-40 flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 class="h-8 w-8 text-emerald-500" />
      <p class="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Tudo sincronizado
      </p>
      <p class="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
        As notas, retiradas e alteracoes locais ja foram enviadas para o servidor.
      </p>
    </div>

    <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
      <article
        v-for="entry in props.entries"
        :key="entry.id"
        class="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto]"
      >
        <div class="flex min-w-0 gap-3">
          <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <component :is="entityIcon(entry.entity)" class="h-4 w-4" />
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {{ operationLabel(entry) }}
              </span>
              <span class="rounded px-2 py-0.5 text-[11px] font-bold" :class="methodClass(entry.method)">
                {{ entry.method }}
              </span>
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
                {{ entityLabels[entry.entity] }}
              </span>
            </div>

            <p class="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
              {{ entry.description }}
            </p>

            <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Criado em {{ formatDateTime(entry.createdAt) }}
            </p>

            <div
              v-if="entry.lastError"
              class="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-500/10 dark:text-rose-300"
            >
              <AlertTriangle class="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span class="break-words">{{ entry.lastError }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 md:justify-end">
          <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {{ entry.attempts }} tentativa{{ entry.attempts === 1 ? '' : 's' }}
          </span>
          <span v-if="entry.entityId" class="hidden rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-400 dark:bg-slate-950 md:inline">
            {{ entry.entityId.slice(0, 12) }}
          </span>
        </div>
      </article>
    </div>
  </section>
</template>
