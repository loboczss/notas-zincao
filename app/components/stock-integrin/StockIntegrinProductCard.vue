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
</script>

<template>
  <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
