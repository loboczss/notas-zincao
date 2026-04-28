<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ShieldAlert } from 'lucide-vue-next'
import AppPageShell from '../components/layout/AppPageShell.vue'
import EstoqueProdutoModal from '../components/estoque/EstoqueProdutoModal.vue'
import EstoqueTabela from '../components/estoque/EstoqueTabela.vue'
import EstoqueToolbar from '../components/estoque/EstoqueToolbar.vue'
import type { EstoqueProduto, EstoqueProdutoDraft } from '../../shared/types/Estoque'
import { useAuthStore, useEstoqueStore } from '../stores'
import Card from '../components/Card.vue'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()
const estoqueStore = useEstoqueStore()

const searchTerm = ref('')
const paginaAtual = ref(1)
const itensPorPagina = ref(30)
const modalAberto = ref(false)
const produtoEmEdicao = ref<Partial<EstoqueProdutoDraft> | null>(null)

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const carregarEstoque = async () => {
  await estoqueStore.fetchProdutos({
    search: searchTerm.value,
    page: paginaAtual.value,
    page_size: itensPorPagina.value,
  })
}

const aplicarFiltros = async () => {
  paginaAtual.value = 1
  await carregarEstoque()
}

const irPaginaAnterior = async () => {
  if (paginaAtual.value <= 1) {
    return
  }

  paginaAtual.value -= 1
  await carregarEstoque()
}

const irProximaPagina = async () => {
  if (paginaAtual.value >= estoqueStore.totalPaginas) {
    return
  }

  paginaAtual.value += 1
  await carregarEstoque()
}

const mudarItensPorPagina = async (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return
  }

  itensPorPagina.value = parsed
  paginaAtual.value = 1
  await carregarEstoque()
}

const abrirNovoProduto = () => {
  produtoEmEdicao.value = null
  modalAberto.value = true
}

const abrirEditarProduto = async (idProduto: number) => {
  const produto = await estoqueStore.fetchProduto(idProduto)
  if (!produto) {
    return
  }

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
  if (!produto) {
    return
  }

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
    description="Consulte os produtos cadastrados e, como administrador, adicione novos itens ou edite os existentes."
  >
    <div class="space-y-6">
      <div v-if="!isAdmin" class="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900/50 dark:bg-brand-500/10 dark:text-brand-200">
        <ShieldAlert class="mt-0.5 h-5 w-5 shrink-0" />
        <p>Seu perfil está em modo somente leitura nesta tela. Apenas administradores podem adicionar ou editar produtos do estoque.</p>
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

      <Card class="flex flex-wrap items-center justify-between gap-4 text-sm" padding-class="px-4 py-3">
        <p class="text-slate-600 dark:text-slate-300">
          Página {{ estoqueStore.page }} de {{ estoqueStore.totalPaginas }} · {{ estoqueStore.totalItens }} produtos
        </p>

        <div class="flex items-center gap-3">
          <label class="text-xs font-medium text-slate-500 dark:text-slate-400">Itens por página</label>
          <select
            :value="String(itensPorPagina)"
            class="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            @change="mudarItensPorPagina(($event.target as HTMLSelectElement).value)"
          >
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>

          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            :disabled="estoqueStore.loadingProdutos || paginaAtual <= 1"
            @click="irPaginaAnterior"
          >
            Anterior
          </button>

          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            :disabled="estoqueStore.loadingProdutos || paginaAtual >= estoqueStore.totalPaginas"
            @click="irProximaPagina"
          >
            Próxima
          </button>
        </div>
      </Card>

      <EstoqueTabela
        :produtos="estoqueStore.produtos"
        :loading="estoqueStore.loadingProdutos"
        :can-edit="isAdmin"
        @edit="abrirEditarProduto"
      />

      <div v-if="estoqueStore.errorMessage && !modalAberto" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
        {{ estoqueStore.errorMessage }}
      </div>
    </div>

    <EstoqueProdutoModal
      v-model="modalAberto"
      :initial-value="produtoEmEdicao"
      :loading="estoqueStore.savingProduto"
      :error-message="estoqueStore.errorMessage"
      @save="salvarProduto"
    />
  </AppPageShell>
</template>
