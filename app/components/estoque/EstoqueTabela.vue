<script setup lang="ts">
import { computed } from 'vue'
import { Pencil } from 'lucide-vue-next'
import type { EstoqueProduto } from '../../../shared/types/Estoque'
import EstoqueCardMobile from './EstoqueCardMobile.vue'

const props = withDefaults(defineProps<{
  produtos: EstoqueProduto[]
  loading?: boolean
  canEdit?: boolean
}>(), {
  loading: false,
  canEdit: false,
})

const emit = defineEmits<{
  (e: 'edit', idProduto: number): void
}>()

const hasProdutos = computed(() => props.produtos.length > 0)

const formatQuantidade = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(value || 0))
}

const formatPreco = (value?: number | string | null) => {
  const parsed = Number(String(value || '').replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0) return null

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parsed)
}
</script>

<template>
  <section>
    <div v-if="props.loading" class="rounded-lg border border-slate-200 bg-white p-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      Carregando produtos do estoque...
    </div>

    <div v-else-if="!hasProdutos" class="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
      <h3 class="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">Nenhum produto encontrado</h3>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Ajuste a busca ou cadastre um novo item.</p>
    </div>

    <div v-else class="space-y-2">
      <div class="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
        <table class="min-w-full table-fixed text-left">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <th class="w-20 px-3 py-2">ID</th>
              <th class="px-3 py-2">Descrição</th>
              <th class="w-36 px-3 py-2">Tipo</th>
              <th class="w-24 px-3 py-2">Emb.</th>
              <th class="w-28 px-3 py-2 text-right">Estoque</th>
              <th class="w-52 px-3 py-2">Pai</th>
              <th class="w-16 px-3 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="produto in props.produtos"
              :key="produto.id_produto"
              class="border-b border-slate-100 text-sm transition-colors last:border-0 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40"
            >
              <td class="px-3 py-2 font-semibold tabular-nums text-slate-900 dark:text-slate-100">#{{ produto.id_produto }}</td>
              <td class="min-w-0 px-3 py-2">
                <p class="truncate font-semibold text-slate-800 dark:text-slate-100">{{ produto.descricao }}</p>
                <p v-if="formatPreco(produto.valor_preco_varejo)" class="mt-0.5 truncate text-[11px] text-slate-400">{{ formatPreco(produto.valor_preco_varejo) }}</p>
              </td>
              <td class="px-3 py-2 text-slate-600 dark:text-slate-300">
                <span class="block truncate">{{ produto.tipo_produto || '-' }}</span>
              </td>
              <td class="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">{{ produto.embalagem_saida || '-' }}</td>
              <td class="px-3 py-2 text-right font-bold tabular-nums text-slate-950 dark:text-white">{{ formatQuantidade(produto.quantidade_estoque) }}</td>
              <td class="min-w-0 px-3 py-2 text-slate-600 dark:text-slate-300">
                <span class="block truncate">{{ produto.produto_pai?.descricao || '-' }}</span>
              </td>
              <td class="px-3 py-2 text-right">
                <button
                  v-if="props.canEdit"
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-brand-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-300"
                  title="Editar produto"
                  aria-label="Editar produto"
                  @click="emit('edit', produto.id_produto)"
                >
                  <Pencil class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-2 md:hidden">
        <EstoqueCardMobile
          v-for="produto in props.produtos"
          :key="produto.id_produto"
          :produto="produto"
          :can-edit="props.canEdit"
          @edit="emit('edit', $event)"
        />
      </div>
    </div>
  </section>
</template>
