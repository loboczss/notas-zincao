<script setup lang="ts">
import { computed } from 'vue'
import type { IntegrimNotasSyncProgress } from '../../../shared/types/IntegrimNotas'
import { formatStockIntegrinNumber } from '../../utils/stock-integrin-format'

const props = withDefaults(defineProps<{
  progress: Partial<IntegrimNotasSyncProgress> | null
  syncing?: boolean
  percent?: number
}>(), {
  syncing: false,
  percent: 0,
})

const progressMessage = computed(() => {
  return props.progress?.message || (props.syncing ? 'Sincronização em andamento.' : '')
})

const progressDetail = computed(() => {
  const p = props.progress
  if (!p) return ''
  if (p.detail) return p.detail

  const details = [
    p.notas_total ? `${p.notas_total} notas` : null,
    p.itens_total ? `${p.itens_total} itens` : null,
    p.total_pages ? `${p.processed_pages}/${p.total_pages} páginas` : null,
    p.current_company ? `Empresa ${p.current_company}` : null,
  ].filter(Boolean)

  return details.join(' | ')
})
</script>

<template>
  <section
    class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
    aria-live="polite"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-bold text-slate-950 dark:text-slate-50">
          {{ progressMessage }}
        </p>
        <p v-if="progressDetail" class="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
          {{ progressDetail }}
        </p>
      </div>
      <p class="text-sm font-bold text-brand-700 dark:text-brand-400">
        {{ formatStockIntegrinNumber(props.percent, 1) }}%
      </p>
    </div>
    <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        class="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
        :style="{ width: `${props.percent}%` }"
      />
    </div>
  </section>
</template>
