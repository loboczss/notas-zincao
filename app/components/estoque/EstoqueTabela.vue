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
</script>

<template>
  <section>
    <div v-if="props.loading" class="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      Carregando produtos do estoque...
    </div>

    <div v-else-if="!hasProdutos" class="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 class="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Nenhum produto encontrado</h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">Ajuste a busca ou cadastre um novo item no estoque.</p>
    </div>

    <div v-else class="space-y-4">
      <div class="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table class="hidden min-w-full text-left md:table">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <th class="px-4 py-3 font-semibold">ID</th>
              <th class="px-4 py-3 font-semibold">Descrição</th>
              <th class="px-4 py-3 font-semibold">Tipo</th>
              <th class="px-4 py-3 font-semibold">Embalagem</th>
              <th class="px-4 py-3 font-semibold">Estoque</th>
              <th class="px-4 py-3 font-semibold">Pai</th>
              <th class="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="produto in props.produtos"
              :key="produto.id_produto"
              class="border-b border-slate-100 text-sm transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40"
            >
              <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">#{{ produto.id_produto }}</td>
              <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ produto.descricao }}</td>
              <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ produto.tipo_produto || '-' }}</td>
              <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ produto.embalagem_saida }}</td>
              <td class="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{{ formatQuantidade(produto.quantidade_estoque) }}</td>
              <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{{ produto.produto_pai?.descricao || '-' }}</td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="props.canEdit"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  @click="emit('edit', produto.id_produto)"
                >
                  <Pencil class="h-4 w-4" />
                  Editar
                </button>
                <span v-else class="text-xs text-slate-400 dark:text-slate-500">Somente leitura</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-3 md:hidden">
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