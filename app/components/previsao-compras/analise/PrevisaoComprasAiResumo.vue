<script setup lang="ts">
import { computed } from 'vue'
import { Sparkles, ArrowRight } from 'lucide-vue-next'
import type { IntegrimCompraAiDashboardResponse } from '../../../../shared/types/IntegrimNotas'
import { formatStockIntegrinNumber } from '../../../utils/stock-integrin-format'
import PcCard from '../ui/PcCard.vue'
import PcBadge from '../ui/PcBadge.vue'

const props = withDefaults(defineProps<{
  dashboard: IntegrimCompraAiDashboardResponse | null
  loading?: boolean
}>(), {
  loading: false,
})

// Apenas oportunidades novas (ainda não tratadas), ordenadas pela confiança.
const topOportunidades = computed(() => {
  const lista = (props.dashboard?.oportunidades || []).filter(o => o.status === 'nova')
  return [...lista].sort((a, b) => b.confidence - a.confidence).slice(0, 4)
})

const totalNovas = computed(() => props.dashboard?.stats.oportunidades_novas ?? topOportunidades.value.length)
const temAlguma = computed(() => topOportunidades.value.length > 0)
</script>

<template>
  <PcCard padding="sm">
    <div class="flex items-center justify-between gap-2">
      <p class="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
        <Sparkles class="h-4 w-4 text-brand-500" />
        Oportunidades da IA
        <PcBadge v-if="totalNovas > 0" tone="brand" size="sm">{{ totalNovas }} nova{{ totalNovas === 1 ? '' : 's' }}</PcBadge>
      </p>
      <NuxtLink
        to="/previsao-compras/ia"
        class="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        Ver tudo na aba IA <ArrowRight class="h-3 w-3" />
      </NuxtLink>
    </div>

    <p class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
      Compras extras sugeridas pela IA a partir de eventos e promoções detectados na região — além da reposição normal.
    </p>

    <div v-if="props.loading && !temAlguma" class="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
      Carregando…
    </div>
    <div v-else-if="!temAlguma" class="py-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
      Nenhuma oportunidade aberta no momento.
    </div>
    <div v-else class="mt-2.5 grid gap-2 sm:grid-cols-2">
      <div
        v-for="op in topOportunidades"
        :key="op.id"
        class="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-950/30"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="line-clamp-1 text-xs font-bold text-slate-800 dark:text-slate-200">{{ op.descricao || `Produto ${op.idproduto}` }}</p>
          <span class="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-black text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            +{{ formatStockIntegrinNumber(op.compra_extra, 0) }} un
          </span>
        </div>
        <p class="mt-0.5 line-clamp-2 text-[10px] text-slate-500 dark:text-slate-400">{{ op.motivo }}</p>
        <div class="mt-1 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
          <span v-if="op.evento_titulo" class="line-clamp-1">{{ op.evento_titulo }}</span>
          <span class="ml-auto shrink-0">{{ formatStockIntegrinNumber(op.confidence * 100, 0) }}% confiança</span>
        </div>
      </div>
    </div>
  </PcCard>
</template>
