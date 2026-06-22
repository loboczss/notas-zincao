<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Info } from 'lucide-vue-next'
import type { IntegrimVendaDiaCoverage } from '../../../shared/types/IntegrimNotas'

const props = defineProps<{
  coverage: IntegrimVendaDiaCoverage | null
}>()

// Mostra aviso quando o periodo pedido NAO tem dados diarios reais e nao cai no
// fallback de presets (30/90/180/365 terminando hoje) -> a tela mostraria zeros.
const semDados = computed(() => Boolean(props.coverage) && props.coverage!.periodo_coberto === false)

// Aviso leve quando os numeros vem do fallback de presets (sem historico diario).
const usandoFallback = computed(() =>
  Boolean(props.coverage)
  && props.coverage!.fallback_aplicavel
  && !props.coverage!.has_daily_rows,
)

const intervalo = computed(() => {
  const c = props.coverage
  if (!c || !c.daily_min_date || !c.daily_max_date) return null
  return `${c.daily_min_date} a ${c.daily_max_date}`
})
</script>

<template>
  <div
    v-if="semDados"
    class="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
  >
    <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
    <div class="space-y-1">
      <p class="font-bold text-amber-800 dark:text-amber-200">
        Este período não tem dados diários sincronizados.
      </p>
      <p class="text-amber-700 dark:text-amber-300/90">
        Os valores aparecem zerados porque a tabela de vendas por dia ainda não foi preenchida para este intervalo.
        Funcionam normalmente os períodos de 30, 90, 180 e 365 dias terminando hoje. Para liberar qualquer
        intervalo, rode a sincronização das notas (ou o recálculo de vendas por período).
        <span v-if="intervalo" class="font-semibold">Dados diários disponíveis: {{ intervalo }}.</span>
      </p>
    </div>
  </div>

  <div
    v-else-if="usandoFallback"
    class="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs dark:border-sky-500/30 dark:bg-sky-500/10"
  >
    <Info class="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
    <p class="text-sky-700 dark:text-sky-300/90">
      Números estimados a partir dos totais consolidados (30/90/180/365 dias). Sincronize para habilitar
      qualquer intervalo de datas e a comparação com o período anterior.
    </p>
  </div>
</template>
