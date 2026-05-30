<script setup lang="ts">
import type { StockIntegrinProduto } from '../../../shared/types/StockIntegrin'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
  stockIntegrinProductSubtitle,
} from '../../utils/stock-integrin-format'

const props = defineProps<{
  produto: StockIntegrinProduto
}>()

const emit = defineEmits<{
  (e: 'select', produto: StockIntegrinProduto): void
}>()

const selecionarProduto = () => {
  emit('select', props.produto)
}
</script>

<template>
  <article
    class="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-slate-950/60"
    role="button"
    tabindex="0"
    :aria-label="`Abrir detalhes de ${props.produto.descrcomproduto}`"
    @click="selecionarProduto"
    @keydown.enter.prevent="selecionarProduto"
    @keydown.space.prevent="selecionarProduto"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-semibold text-slate-950 dark:text-slate-50">
          {{ props.produto.descrcomproduto }}
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ stockIntegrinProductSubtitle(props.produto) }}
        </p>
      </div>
      <p class="shrink-0 text-right text-lg font-bold text-slate-950 dark:text-slate-50">
        {{ formatStockIntegrinNumber(props.produto.qtdsaldodisponivel) }}
      </p>
    </div>

    <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
      <p>
        Local:
        <span class="font-semibold text-slate-700 dark:text-slate-200">
          {{ props.produto.descrlocalestoque || props.produto.idlocalestoque }}
        </span>
      </p>
      <p>
        Preco:
        <span class="font-semibold text-slate-700 dark:text-slate-200">
          {{ formatStockIntegrinCurrency(props.produto.valprecovarejo) }}
        </span>
      </p>
      <p>
        Atual:
        <span class="font-semibold text-slate-700 dark:text-slate-200">
          {{ formatStockIntegrinNumber(props.produto.qtdsaldoatual) }}
        </span>
      </p>
      <p>
        Reserva:
        <span class="font-semibold text-slate-700 dark:text-slate-200">
          {{ formatStockIntegrinNumber(props.produto.qtdsaldoreserva) }}
        </span>
      </p>
    </div>
  </article>
</template>
