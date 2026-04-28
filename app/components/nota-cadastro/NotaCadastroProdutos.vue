<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import type { NotaProduto } from '../../../shared/types/NotasRetirada'
import type { EstoqueProduto } from '../../../shared/types/Estoque'
import Input from '../Input.vue'
import { useEstoqueStore } from '../../stores'

const props = defineProps<{
  produtos: NotaProduto[]
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'addProduto'): void
  (e: 'removeProduto', index: number): void
  (e: 'updateProduto', payload: { index: number; field: keyof NotaProduto; value: string }): void
}>()

const estoqueStore = useEstoqueStore()
const suggestions = ref<Record<number, EstoqueProduto[]>>({})
const loadingSuggestions = ref<Record<number, boolean>>({})
const searchTimers = new Map<number, ReturnType<typeof setTimeout>>()

const normalizeBusca = (value: string) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const clearSuggestions = (index: number) => {
  suggestions.value[index] = []
  loadingSuggestions.value[index] = false
}

const buscarProduto = (index: number, value: string) => {
  emit('updateProduto', { index, field: 'nome', value })
  emit('updateProduto', { index, field: 'id_produto_estoque', value: '' })
  emit('updateProduto', { index, field: 'confidence', value: '' })

  if (searchTimers.has(index)) {
    clearTimeout(searchTimers.get(index)!)
  }

  const termo = value.trim()
  if (termo.length < 2) {
    clearSuggestions(index)
    return
  }

  loadingSuggestions.value[index] = true
  const timer = setTimeout(async () => {
    const result = await estoqueStore.searchProdutos(termo, { limit: 8 })
    suggestions.value[index] = result
    loadingSuggestions.value[index] = false

    const produtoAtual = props.produtos[index]
    if (produtoAtual?.id_produto_estoque) {
      return
    }

    const termoNormalizado = normalizeBusca(termo)
    const correspondenciaExata = result.find(item => normalizeBusca(item.descricao) === termoNormalizado)
    const correspondenciaUnica = result.length === 1 ? result[0] : null
    const melhor = correspondenciaExata || correspondenciaUnica

    if (melhor) {
      selecionarProdutoEstoque(index, melhor)
    }
  }, 220)

  searchTimers.set(index, timer)
}

const selecionarProdutoEstoque = (index: number, produtoEstoque: EstoqueProduto) => {
  emit('updateProduto', { index, field: 'nome', value: produtoEstoque.descricao })
  emit('updateProduto', { index, field: 'id_produto_estoque', value: String(produtoEstoque.id_produto) })
  emit('updateProduto', { index, field: 'embalagem', value: produtoEstoque.embalagem_saida })
  emit('updateProduto', { index, field: 'tipo_produto', value: String(produtoEstoque.tipo_produto || '') })
  emit('updateProduto', { index, field: 'confidence', value: '1' })
  clearSuggestions(index)
}

const atualizarIdProdutoManual = async (index: number, value: string) => {
  const idNormalizado = value.replace(/\D/g, '')
  emit('updateProduto', { index, field: 'id_produto_estoque', value: idNormalizado })

  if (!idNormalizado) {
    emit('updateProduto', { index, field: 'confidence', value: '' })
    return
  }

  const idProduto = Number(idNormalizado)
  if (!Number.isFinite(idProduto) || idProduto <= 0) {
    return
  }

  const result = await estoqueStore.searchProdutos(String(idProduto), { limit: 1 })
  const produtoPorId = result.find(item => item.id_produto === idProduto)

  if (produtoPorId) {
    selecionarProdutoEstoque(index, produtoPorId)
  }
}

onBeforeUnmount(() => {
  for (const timer of searchTimers.values()) {
    clearTimeout(timer)
  }
})
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Produtos</p>
        <h2 class="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Itens da nota</h2>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        @click="emit('addProduto')"
      >
        <Plus class="h-4 w-4" />
        Adicionar item
      </button>
    </div>

    <p v-if="props.errors.produtos" class="mt-3 text-xs text-rose-600 dark:text-rose-400">{{ props.errors.produtos }}</p>

    <div class="mt-4 space-y-3">
      <div
        v-for="(produto, index) in props.produtos"
        :key="`produto-${index}`"
        class="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800/40 dark:bg-slate-950/20"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <p class="text-sm font-bold text-slate-900 dark:text-slate-100">Item {{ index + 1 }}</p>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
            @click="emit('removeProduto', index)"
          >
            <Trash2 class="h-3.5 w-3.5" />
            Remover
          </button>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div class="relative md:col-span-2 xl:col-span-2">
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Produto</label>
            <Input :model-value="String(produto.nome || '')" @update:model-value="buscarProduto(index, $event)" />

            <p v-if="produto.id_produto_estoque" class="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Vinculado ao estoque: #{{ produto.id_produto_estoque }}
              <span v-if="produto.tipo_produto"> · {{ produto.tipo_produto }}</span>
              <span v-if="produto.embalagem"> · {{ produto.embalagem }}</span>
            </p>

            <div
              v-if="loadingSuggestions[index] || (suggestions[index] && suggestions[index].length)"
              class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-950"
            >
              <div v-if="loadingSuggestions[index]" class="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                Buscando produtos...
              </div>

              <div v-else class="max-h-64 overflow-y-auto p-2">
                <button
                  v-for="produtoEstoque in suggestions[index]"
                  :key="produtoEstoque.id_produto"
                  type="button"
                  class="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                  @click="selecionarProdutoEstoque(index, produtoEstoque)"
                >
                  <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ produtoEstoque.descricao }}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">
                    #{{ produtoEstoque.id_produto }}
                    <span v-if="produtoEstoque.tipo_produto"> · {{ produtoEstoque.tipo_produto }}</span>
                    <span v-if="produtoEstoque.embalagem_saida"> · {{ produtoEstoque.embalagem_saida }}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">ID do estoque</label>
            <Input
              :model-value="produto.id_produto_estoque ? String(produto.id_produto_estoque) : ''"
              placeholder="Automático ou manual"
              inputmode="numeric"
              @update:model-value="atualizarIdProdutoManual(index, $event)"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Quantidade</label>
            <Input type="number" :model-value="String(produto.quantidade ?? '')" @update:model-value="emit('updateProduto', { index, field: 'quantidade', value: $event })" />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Valor unitário</label>
            <Input type="number" :model-value="String(produto.valor_unitario ?? '')" @update:model-value="emit('updateProduto', { index, field: 'valor_unitario', value: $event })" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
