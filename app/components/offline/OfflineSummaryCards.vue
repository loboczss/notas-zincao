<script setup lang="ts">
import { computed, type Component } from 'vue'
import { AlertTriangle, CloudUpload, Database, FileText } from 'lucide-vue-next'
import type { OfflineQueueSummary } from '../../utils/offline-db'

const props = defineProps<{
  summary: OfflineQueueSummary
  isOnline: boolean
  syncing?: boolean
}>()

const cards = computed<Array<{
  label: string
  value: number | string
  icon: Component
  iconClass: string
  caption?: string
}>>(() => [
  {
    label: 'Total pendente',
    value: props.syncing ? 'Sincronizando' : props.summary.total,
    icon: CloudUpload,
    iconClass: props.isOnline ? 'text-emerald-500' : 'text-amber-500',
    caption: props.isOnline ? 'Online' : 'Offline',
  },
  {
    label: 'Notas',
    value: props.summary.byEntity.notas,
    icon: FileText,
    iconClass: 'text-brand-600 dark:text-brand-400',
  },
  {
    label: 'Estoque',
    value: props.summary.byEntity.estoque,
    icon: Database,
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Falhas',
    value: props.summary.failed,
    icon: AlertTriangle,
    iconClass: props.summary.failed > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500',
  },
])
</script>

<template>
  <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
    <article
      v-for="card in cards"
      :key="card.label"
      class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="flex items-center gap-2">
        <component :is="card.icon" class="h-4 w-4 shrink-0" :class="card.iconClass" />
        <span class="min-w-0 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ card.label }}
        </span>
      </div>

      <div class="mt-2 flex items-baseline gap-2">
        <span class="truncate text-2xl font-bold text-slate-900 dark:text-white">
          {{ card.value }}
        </span>
        <span v-if="card.caption" class="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {{ card.caption }}
        </span>
      </div>
    </article>
  </div>
</template>
