<script setup lang="ts">
import { computed } from 'vue'
import { Boxes, Clock3, Filter, PackageSearch } from 'lucide-vue-next'
import type { StockIntegrinStats, StockIntegrinSyncRun } from '../../../shared/types/StockIntegrin'
import Card from '../Card.vue'
import { formatStockIntegrinDate, formatStockIntegrinNumber } from '../../utils/stock-integrin-format'

const props = defineProps<{
  totalItens: number
  stats: StockIntegrinStats
  latestStatus?: StockIntegrinSyncRun['status'] | null
}>()

const statusLabel = computed(() => {
  if (props.latestStatus === 'success') return 'Sincronizado'
  if (props.latestStatus === 'running') return 'Rodando'
  if (props.latestStatus === 'cancelled') return 'Interrompido'
  if (props.latestStatus === 'failed') return 'Falhou'
  return 'Sem sync'
})

const statusClass = computed(() => {
  if (props.latestStatus === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300'
  if (props.latestStatus === 'running') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300'
  if (props.latestStatus === 'cancelled') return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
  if (props.latestStatus === 'failed') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300'
  return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
})
</script>

<template>
  <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Card>
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Produtos</p>
        <PackageSearch class="h-5 w-5 text-brand-600 dark:text-brand-300" />
      </div>
      <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">
        {{ formatStockIntegrinNumber(props.totalItens, 0) }}
      </p>
    </Card>

    <Card>
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Saldo disponivel</p>
        <Boxes class="h-5 w-5 text-brand-600 dark:text-brand-300" />
      </div>
      <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">
        {{ formatStockIntegrinNumber(props.stats.saldo_disponivel_total) }}
      </p>
    </Card>

    <Card>
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Empresas</p>
        <Filter class="h-5 w-5 text-brand-600 dark:text-brand-300" />
      </div>
      <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">
        {{ props.stats.empresas.length || '-' }}
      </p>
    </Card>

    <Card>
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Status</p>
        <Clock3 class="h-5 w-5 text-brand-600 dark:text-brand-300" />
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <span class="rounded-full border px-2 py-1 text-xs font-bold" :class="statusClass">
          {{ statusLabel }}
        </span>
        <span class="text-sm text-slate-500 dark:text-slate-400">
          {{ formatStockIntegrinDate(props.stats.ultima_sincronizacao) }}
        </span>
      </div>
    </Card>
  </section>
</template>
