<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ShieldAlert } from 'lucide-vue-next'
import AppPageShell from '../components/layout/AppPageShell.vue'
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger.vue'
import EstoqueProdutoModal from '../components/estoque/EstoqueProdutoModal.vue'
import EstoqueTabela from '../components/estoque/EstoqueTabela.vue'
import EstoqueToolbar from '../components/estoque/EstoqueToolbar.vue'
import type { EstoqueProdutoDraft } from '../../shared/types/Estoque'
import { useAuthStore, useEstoqueStore } from '../stores'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()
const estoqueStore = useEstoqueStore()

const searchTerm = ref('')
const itensPorPagina = ref(30)
const modalAberto = ref(false)
const produtoEmEdicao = ref<Partial<EstoqueProdutoDraft> | null>(null)

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const carregarEstoque = async (options: { append?: boolean; page?: number } = {}) => {
  const append = Boolean(options.append)
  const pageToLoad = options.page || (append ? estoqueStore.page + 1 : 1)

  if (append && (estoqueStore.loadingProdutos || pageToLoad > estoqueStore.totalPaginas)) return

  await estoqueStore.fetchProdutos({
    search: searchTerm.value,
    page: pageToLoad,
    page_size: itensPorPagina.value,
  }, { append })
}

const aplicarFiltros = async () => {
  await carregarEstoque()
}

const produtosTemMais = computed(() => estoqueStore.produtos.length < estoqueStore.totalItens && estoqueStore.page < estoqueStore.totalPaginas)
const produtosLoadingInicial = computed(() => estoqueStore.loadingProdutos && !estoqueStore.produtos.length)
const produtosLoadingMais = computed(() => estoqueStore.loadingProdutos && estoqueStore.produtos.length > 0)

const carregarMaisProdutos = async () => {
  if (estoqueStore.loadingProdutos || !produtosTemMais.value) return

  await carregarEstoque({
    append: true,
    page: estoqueStore.page + 1,
  })
}

const abrirNovoProduto = () => {
  produtoEmEdicao.value = null
  modalAberto.value = true
}

const abrirEditarProduto = async (idProduto: number) => {
  const produto = await estoqueStore.fetchProduto(idProduto)
  if (!produto) return

  produtoEmEdicao.value = {
    id_produto: produto.id_produto,
    descricao: produto.descricao,
    embalagem_saida: produto.embalagem_saida,
    valor_preco_varejo: produto.valor_preco_varejo,
    tipo_produto: produto.tipo_produto,
    quantidade_estoque: produto.quantidade_estoque,
    id_produto_pai: produto.id_produto_pai,
    fator_conversao: produto.fator_conversao,
  }
  modalAberto.value = true
}

const salvarProduto = async (payload: EstoqueProdutoDraft) => {
  const produto = await estoqueStore.saveProduto(payload)
  if (!produto) return

  modalAberto.value = false
  produtoEmEdicao.value = null
}

onMounted(async () => {
  if (!authStore.profile) {
    await authStore.getMe()
  }

  await carregarEstoque()
})
</script>

<template>
  <AppPageShell
    eyebrow="Estoque"
    title="Gestão de estoque"
  >
    <div class="space-y-3">
      <div
        v-if="!isAdmin"
        class="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:border-brand-900/50 dark:bg-brand-500/10 dark:text-brand-200"
      >
        <ShieldAlert class="mt-0.5 h-4 w-4 shrink-0" />
        <p>Seu perfil está em modo somente leitura nesta tela.</p>
      </div>

      <EstoqueToolbar
        :search-term="searchTerm"
        :loading="estoqueStore.loadingProdutos"
        :can-edit="isAdmin"
        @update:search-term="searchTerm = $event"
        @search="aplicarFiltros"
        @refresh="carregarEstoque"
        @new="abrirNovoProduto"
      />

      <EstoqueTabela
        :produtos="estoqueStore.produtos"
        :loading="produtosLoadingInicial"
        :can-edit="isAdmin"
        @edit="abrirEditarProduto"
      />

      <InfiniteScrollTrigger
        v-if="estoqueStore.produtos.length"
        :loading="produtosLoadingMais"
        :done="!produtosTemMais"
        :loaded-count="estoqueStore.produtos.length"
        :total="estoqueStore.totalItens"
        label="produtos"
        done-label="Todos os produtos foram carregados."
        @load-more="carregarMaisProdutos"
      />
    </div>

    <EstoqueProdutoModal
      v-model="modalAberto"
      :initial-value="produtoEmEdicao"
      :loading="estoqueStore.savingProduto"
      @save="salvarProduto"
    />
  </AppPageShell>
</template>
