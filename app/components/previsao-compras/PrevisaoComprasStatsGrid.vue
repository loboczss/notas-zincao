<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  Coins,
  Package,
  Sparkles,
  TrendingUp,
} from 'lucide-vue-next'
import type { IntegrimProdutoValorStats } from '../../../shared/types/IntegrimNotas'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../utils/stock-integrin-format'

const props = defineProps<{
  stats: IntegrimProdutoValorStats
}>()

const formattedTotalProdutos = computed(() => {
  return formatStockIntegrinNumber(props.stats.total_produtos, 0)
})

const formattedFaturamento = computed(() => {
  return formatStockIntegrinCurrency(props.stats.faturamento_periodo_total)
})

const formattedLucro = computed(() => {
  return formatStockIntegrinCurrency(props.stats.margem_periodo_total)
})

const formattedEmRisco = computed(() => {
  return formatStockIntegrinNumber(props.stats.produtos_em_risco, 0)
})

const formattedOportunidadesIa = computed(() => {
  return formatStockIntegrinNumber(props.stats.oportunidades_ia, 0)
})
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-slate-500 dark:text-slate-400">Produtos vendidos</span>
        <div class="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
          <Package class="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
      </div>
      <div class="mt-4">
        <h3 class="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
          {{ formattedTotalProdutos }}
        </h3>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Itens no periodo filtrado
        </p>
      </div>
    </div>

    <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-slate-500 dark:text-slate-400">Faturamento</span>
        <div class="rounded-lg bg-brand-100/60 p-2 dark:bg-brand-500/10">
          <TrendingUp class="h-5 w-5 text-brand-700 dark:text-brand-400" />
        </div>
      </div>
      <div class="mt-4">
        <h3 class="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
          {{ formattedFaturamento }}
        </h3>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Total do intervalo
        </p>
      </div>
    </div>

    <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-slate-500 dark:text-slate-400">Lucro estimado</span>
        <div class="rounded-lg bg-emerald-100/60 p-2 dark:bg-emerald-500/10">
          <Coins class="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
        </div>
      </div>
      <div class="mt-4">
        <h3 class="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
          {{ formattedLucro }}
        </h3>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Faturamento menos custo
        </p>
      </div>
    </div>

    <div class="relative overflow-hidden rounded-xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm transition hover:shadow-md dark:border-rose-900/30 dark:bg-rose-500/5">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-rose-800 dark:text-rose-300">Perto de acabar</span>
        <div class="rounded-lg bg-rose-100 p-2 dark:bg-rose-950/40">
          <AlertTriangle class="h-5 w-5 text-rose-700 dark:text-rose-400" />
        </div>
      </div>
      <div class="mt-4">
        <h3 class="text-2xl font-bold tracking-tight text-rose-700 dark:text-rose-300">
          {{ formattedEmRisco }}
        </h3>
        <p class="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80">
          Cobertura menor que 30 dias
        </p>
      </div>
    </div>

    <div class="relative overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60 p-5 shadow-sm transition hover:shadow-md dark:border-violet-500/30 dark:bg-violet-500/10">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-violet-800 dark:text-violet-300">Oportunidades IA</span>
        <div class="rounded-lg bg-violet-100 p-2 dark:bg-violet-950/40">
          <Sparkles class="h-5 w-5 text-violet-700 dark:text-violet-300" />
        </div>
      </div>
      <div class="mt-4">
        <h3 class="text-2xl font-bold tracking-tight text-violet-800 dark:text-violet-200">
          {{ formattedOportunidadesIa }}
        </h3>
        <p class="mt-1 text-xs text-violet-700/80 dark:text-violet-300/80">
          Sugestoes externas abertas
        </p>
      </div>
    </div>
  </div>
</template>
