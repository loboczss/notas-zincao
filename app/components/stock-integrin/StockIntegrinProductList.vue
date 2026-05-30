<script setup lang="ts">
import type { StockIntegrinProduto } from '../../../shared/types/StockIntegrin'
import Card from '../Card.vue'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinDate,
  formatStockIntegrinNumber,
  stockIntegrinProductSubtitle,
} from '../../utils/stock-integrin-format'
import StockIntegrinProductCard from './StockIntegrinProductCard.vue'

const props = withDefaults(defineProps<{
  produtos: StockIntegrinProduto[]
  loadingInitial?: boolean
}>(), {
  loadingInitial: false,
})

const emit = defineEmits<{
  (e: 'select', produto: StockIntegrinProduto): void
}>()

const selecionarProduto = (produto: StockIntegrinProduto) => {
  emit('select', produto)
}
</script>

<template>
  <section>
    <Card padding-class="p-0" class="hidden overflow-hidden lg:block">
      <div v-if="props.loadingInitial" class="flex min-h-72 items-center justify-center">
        <span class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>

      <table v-else class="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
        <thead class="bg-slate-100 text-xs font-bold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          <tr>
            <th class="px-4 py-3">Produto</th>
            <th class="px-4 py-3">Empresa</th>
            <th class="px-4 py-3">Local</th>
            <th class="px-4 py-3 text-right">Disponivel</th>
            <th class="px-4 py-3 text-right">Atual</th>
            <th class="px-4 py-3 text-right">Reserva</th>
            <th class="px-4 py-3 text-right">Preco</th>
            <th class="px-4 py-3">Atualizado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr
            v-for="produto in props.produtos"
            :key="produto.id"
            class="cursor-pointer transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none dark:hover:bg-slate-950/60 dark:focus:bg-slate-950/60"
            tabindex="0"
            role="button"
            :aria-label="`Abrir detalhes de ${produto.descrcomproduto}`"
            @click="selecionarProduto(produto)"
            @keydown.enter.prevent="selecionarProduto(produto)"
            @keydown.space.prevent="selecionarProduto(produto)"
          >
            <td class="max-w-md px-4 py-3">
              <p class="font-semibold text-slate-950 dark:text-slate-50">
                {{ produto.descrcomproduto }}
              </p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {{ stockIntegrinProductSubtitle(produto) }}
              </p>
            </td>
            <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
              {{ produto.idempresa }}
            </td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
              {{ produto.descrlocalestoque || `Local ${produto.idlocalestoque}` }}
            </td>
            <td class="px-4 py-3 text-right font-bold text-slate-950 dark:text-slate-50">
              {{ formatStockIntegrinNumber(produto.qtdsaldodisponivel) }}
            </td>
            <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
              {{ formatStockIntegrinNumber(produto.qtdsaldoatual) }}
            </td>
            <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
              {{ formatStockIntegrinNumber(produto.qtdsaldoreserva) }}
            </td>
            <td class="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">
              {{ formatStockIntegrinCurrency(produto.valprecovarejo) }}
            </td>
            <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              {{ formatStockIntegrinDate(produto.integrim_updated_at || produto.estoque_dtalteracao) }}
            </td>
          </tr>

          <tr v-if="!props.produtos.length">
            <td colspan="8" class="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum produto encontrado.
            </td>
          </tr>
        </tbody>
      </table>
    </Card>

    <div class="grid gap-3 lg:hidden">
      <div
        v-if="props.loadingInitial"
        class="flex min-h-40 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <span class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>

      <StockIntegrinProductCard
        v-for="produto in props.produtos"
        :key="produto.id"
        :produto="produto"
        @select="selecionarProduto"
      />

      <div
        v-if="!props.loadingInitial && !props.produtos.length"
        class="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
      >
        Nenhum produto encontrado.
      </div>
    </div>
  </section>
</template>
