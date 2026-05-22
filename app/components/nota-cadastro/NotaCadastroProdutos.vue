<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import type { NotaProduto } from '../../../shared/types/NotasRetirada'
import type { EstoqueProduto } from '../../../shared/types/Estoque'
import Botao from '../Botao.vue'
import Input from '../Input.vue'
import { useEstoqueStore } from '../../stores'
import NotaCadastroField from './NotaCadastroField.vue'
import NotaCadastroSection from './NotaCadastroSection.vue'

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
  <NotaCadastroSection eyebrow="Produtos" title="Itens da nota">
    <template #action>
      <Botao
        type="button"
        variant="secondary"
        size="sm"
        @click="emit('addProduto')"
      >
        <Plus class="h-4 w-4" />
        Adicionar item
      </Botao>
    </template>

    <p
      v-if="props.errors.produtos"
      data-has-error="true"
      class="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
    >
      {{ props.errors.produtos }}
    </p>

    <div class="space-y-2.5">
      <div
        v-for="(produto, index) in props.produtos"
        :key="`produto-${index}`"
        class="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800/40 dark:bg-slate-950/20"
      >
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-sm font-bold text-slate-900 dark:text-slate-100">Item {{ index + 1 }}</p>
          <Botao
            type="button"
            variant="danger"
            size="sm"
            :aria-label="`Remover item ${index + 1}`"
            @click="emit('removeProduto', index)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </Botao>
        </div>

        <div class="grid grid-cols-2 gap-2.5 xl:grid-cols-8">
          <NotaCadastroField class="relative col-span-2 xl:col-span-4" label="Produto">
            <Input :model-value="String(produto.nome || '')" size="sm" @update:model-value="buscarProduto(index, $event)" />

            <p v-if="produto.id_produto_estoque" class="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              Vinculado ao estoque: #{{ produto.id_produto_estoque }}
              <span v-if="produto.tipo_produto"> - {{ produto.tipo_produto }}</span>
              <span v-if="produto.embalagem"> - {{ produto.embalagem }}</span>
            </p>

            <div
              v-if="loadingSuggestions[index] || (suggestions[index] && suggestions[index].length)"
              class="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-950"
            >
              <div v-if="loadingSuggestions[index]" class="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                Buscando produtos...
              </div>

              <div v-else class="max-h-52 overflow-y-auto p-1.5">
                <button
                  v-for="produtoEstoque in suggestions[index]"
                  :key="produtoEstoque.id_produto"
                  type="button"
                  class="flex w-full flex-col rounded-md px-2.5 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                  @click="selecionarProdutoEstoque(index, produtoEstoque)"
                >
                  <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ produtoEstoque.descricao }}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">
                    #{{ produtoEstoque.id_produto }}
                    <span v-if="produtoEstoque.tipo_produto"> - {{ produtoEstoque.tipo_produto }}</span>
                    <span v-if="produtoEstoque.embalagem_saida"> - {{ produtoEstoque.embalagem_saida }}</span>
                  </span>
                </button>
              </div>
            </div>
          </NotaCadastroField>

          <NotaCadastroField class="col-span-2 sm:col-span-1 xl:col-span-2" label="ID estoque">
            <Input
              :model-value="produto.id_produto_estoque ? String(produto.id_produto_estoque) : ''"
              placeholder="Auto ou manual"
              size="sm"
              inputmode="numeric"
              @update:model-value="atualizarIdProdutoManual(index, $event)"
            />
          </NotaCadastroField>

          <NotaCadastroField class="xl:col-span-1" label="Qtd">
            <Input type="number" :model-value="String(produto.quantidade ?? '')" size="sm" @update:model-value="emit('updateProduto', { index, field: 'quantidade', value: $event })" />
          </NotaCadastroField>

          <NotaCadastroField class="xl:col-span-1" label="Valor">
            <Input type="number" :model-value="String(produto.valor_unitario ?? '')" size="sm" @update:model-value="emit('updateProduto', { index, field: 'valor_unitario', value: $event })" />
          </NotaCadastroField>
        </div>
      </div>
    </div>
  </NotaCadastroSection>
</template>
