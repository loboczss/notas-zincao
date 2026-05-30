<script setup lang="ts">
import { computed } from 'vue'
import type { StockIntegrinSyncProgress } from '../../../shared/types/StockIntegrin'
import { formatStockIntegrinNumber } from '../../utils/stock-integrin-format'

const props = withDefaults(defineProps<{
  progress: StockIntegrinSyncProgress | null
  syncing?: boolean
  percent?: number
}>(), {
  syncing: false,
  percent: 0,
})

const progressMessage = computed(() => {
  return props.progress?.message || (props.syncing ? 'Sincronizacao em andamento.' : '')
})

const progressDetail = computed(() => {
  const progress = props.progress
  if (!progress) return ''

  const details = [
    progress.current_company ? `Empresa ${progress.current_company}` : null,
    progress.current_page ? `pagina ${progress.current_page}` : null,
    progress.total_pages ? `${progress.processed_pages}/${progress.total_pages} paginas` : null,
    progress.processed_saldos ? `${formatStockIntegrinNumber(progress.processed_saldos, 0)} saldos lidos` : null,
  ].filter(Boolean)

  return details.join(' | ')
})
</script>

<template>
  <section
    class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    aria-live="polite"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-bold text-slate-950 dark:text-slate-50">
          {{ progressMessage }}
        </p>
        <p v-if="progressDetail" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ progressDetail }}
        </p>
      </div>
      <p class="text-sm font-bold text-brand-700 dark:text-brand-300">
        {{ formatStockIntegrinNumber(props.percent, 1) }}%
      </p>
    </div>

    <div class="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        class="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
        :style="{ width: `${props.percent}%` }"
      />
    </div>
  </section>
</template>
