<script setup lang="ts">
import { computed } from 'vue'
import type { IntegrimProdutoValor } from '../../../../shared/types/IntegrimNotas'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../../utils/stock-integrin-format'

const props = defineProps<{
  produto: IntegrimProdutoValor
}>()

const emit = defineEmits<{
  (e: 'select', produto: IntegrimProdutoValor): void
}>()

const statusInfo = computed(() => {
  const p = props.produto
  if (p.giro_diario <= 0) {
    return {
      label: 'Sem venda',
      badge: 'bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400',
      dot: 'bg-slate-400',
      textClass: 'text-slate-400 dark:text-slate-550',
    }
  }

  const dias = p.dias_cobertura
  if (dias !== null && dias < 15) {
    return {
      label: 'Comprar',
      badge: 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40',
      dot: 'bg-rose-500 animate-pulse',
      textClass: 'text-rose-600 dark:text-rose-450 font-bold',
    }
  }

  if (dias !== null && dias < 45) {
    return {
      label: 'Atenção',
      badge: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40',
      dot: 'bg-amber-500 animate-pulse',
      textClass: 'text-amber-600 dark:text-amber-450 font-semibold',
    }
  }

  return {
    label: 'Saudável',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40',
    dot: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  }
})

const formatCobertura = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  if (value >= 999) return '999+ dias'
  return `${formatStockIntegrinNumber(value, 0)} dias`
}

const formatConfidence = (value: number) =>
  `${formatStockIntegrinNumber(Number(value || 0) * 100, 0)}%`

const handleSelect = () => {
  emit('select', props.produto)
}
</script>

<template>
  <tr
    class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer border-b border-slate-100 dark:border-slate-800/40 transition-colors"
    @click="handleSelect"
  >
    <td class="px-3 py-1.5 min-w-[200px] max-w-[320px]">
      <div class="min-w-0">
        <p class="truncate font-bold text-slate-800 dark:text-slate-200 text-xs" :title="props.produto.descricao || ''">
          {{ props.produto.descricao || `Produto ${props.produto.idproduto}` }}
        </p>
        <p class="mt-0.5 text-[10px] text-slate-450 dark:text-slate-500 font-semibold">
          Empresa {{ props.produto.idempresa }} · Cód. {{ props.produto.idproduto }}/{{ props.produto.idsubproduto }}
        </p>
      </div>
    </td>

    <td class="px-3 py-1.5 whitespace-nowrap text-center">
      <span
        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold"
        :class="statusInfo.badge"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="statusInfo.dot" />
        {{ statusInfo.label }}
      </span>
    </td>

    <td class="px-3 py-1.5 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs tabular-nums">
      {{ formatStockIntegrinNumber(props.produto.giro_diario, 1) }}
    </td>

    <td class="px-3 py-1.5 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs tabular-nums">
      {{ formatStockIntegrinNumber(props.produto.saldo_disponivel, 0) }}
    </td>

    <td class="px-3 py-1.5 text-right whitespace-nowrap text-xs tabular-nums" :class="statusInfo.textClass">
      {{ formatCobertura(props.produto.dias_cobertura) }}
    </td>

    <td class="px-3 py-1.5 text-right whitespace-nowrap text-xs tabular-nums">
      <span
        v-if="props.produto.sugestao_compra > 0"
        class="font-black text-brand-700 dark:text-brand-400 bg-brand-50 border border-brand-100 rounded-md px-1.5 py-0.5 dark:bg-brand-500/10 dark:border-brand-500/25"
      >
        {{ formatStockIntegrinNumber(props.produto.sugestao_compra, 0) }}
      </span>
      <span v-else class="text-slate-400 dark:text-slate-650 font-medium">-</span>
    </td>

    <td class="px-3 py-1.5 text-right whitespace-nowrap text-xs tabular-nums">
      <span
        v-if="props.produto.ai_oportunidade"
        class="inline-flex items-center justify-end rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-black text-violet-755 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
        :title="`${props.produto.ai_oportunidade.evento_titulo || 'Oportunidade IA'} (${formatConfidence(props.produto.ai_oportunidade.confidence)})`"
      >
        +{{ formatStockIntegrinNumber(props.produto.ai_oportunidade.compra_extra, 0) }}
      </span>
      <span v-else class="text-slate-400 dark:text-slate-655 font-medium">-</span>
    </td>

    <td class="px-3 py-1.5 text-right text-slate-650 dark:text-slate-350 whitespace-nowrap text-xs tabular-nums">
      {{ formatStockIntegrinCurrency(props.produto.faturamento_periodo) }}
    </td>

    <td class="px-3 py-1.5 text-right text-slate-650 dark:text-slate-350 whitespace-nowrap text-xs tabular-nums">
      {{ formatStockIntegrinCurrency(props.produto.margem_periodo) }}
    </td>

    <td class="px-3 py-1.5 text-right font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap text-xs tabular-nums">
      {{ formatStockIntegrinNumber(props.produto.score_valor, 1) }}
    </td>
  </tr>
</template>
