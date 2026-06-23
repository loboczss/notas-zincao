<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  Coins,
  Package,
  Sparkles,
  TrendingUp,
} from 'lucide-vue-next'
import type { IntegrimProdutoValorStats } from '../../../../shared/types/IntegrimNotas'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../../utils/stock-integrin-format'

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
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    
    <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/40 transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">Produtos vendidos</span>
        <div class="rounded-lg bg-slate-50 p-1.5 text-slate-600 dark:bg-slate-850 dark:text-slate-400">
          <Package class="h-4.5 w-4.5" />
        </div>
      </div>
      <div class="mt-2.5">
        <h3 class="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {{ formattedTotalProdutos }}
        </h3>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Itens no período filtrado
        </p>
      </div>
    </div>

    <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/40 transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">Faturamento</span>
        <div class="rounded-lg bg-brand-50 p-1.5 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
          <TrendingUp class="h-4.5 w-4.5" />
        </div>
      </div>
      <div class="mt-2.5">
        <h3 class="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {{ formattedFaturamento }}
        </h3>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Total do intervalo
        </p>
      </div>
    </div>

    <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/40 transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">Lucro estimado</span>
        <div class="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Coins class="h-4.5 w-4.5" />
        </div>
      </div>
      <div class="mt-2.5">
        <h3 class="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {{ formattedLucro }}
        </h3>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Faturamento menos custo
        </p>
      </div>
    </div>

    <div class="relative overflow-hidden rounded-xl border border-rose-200 bg-rose-500/5 p-4 shadow-xs hover:shadow-sm dark:border-rose-905/30 dark:bg-rose-950/10 transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Perto de acabar</span>
        <div class="rounded-lg bg-rose-100/50 p-1.5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertTriangle class="h-4.5 w-4.5" />
        </div>
      </div>
      <div class="mt-2.5">
        <h3 class="text-xl font-black tracking-tight text-rose-700 dark:text-rose-350">
          {{ formattedEmRisco }}
        </h3>
        <p class="text-[10px] text-rose-500/80 dark:text-rose-450/80 font-medium">
          Cobertura menor que 30 dias
        </p>
      </div>
    </div>

    <div class="col-span-2 sm:col-span-1 relative overflow-hidden rounded-xl border border-violet-200 bg-violet-50/40 p-4 shadow-xs hover:shadow-sm dark:border-violet-500/30 dark:bg-violet-500/10 transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">Oportunidades IA</span>
        <div class="rounded-lg bg-violet-100 p-1.5 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
          <Sparkles class="h-4.5 w-4.5" />
        </div>
      </div>
      <div class="mt-2.5">
        <h3 class="text-xl font-black tracking-tight text-violet-800 dark:text-violet-200">
          {{ formattedOportunidadesIa }}
        </h3>
        <p class="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
          Sugestões externas abertas
        </p>
      </div>
    </div>
  </div>
</template>
