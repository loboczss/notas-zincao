<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type {
  IntegrimProdutoValor,
  IntegrimProdutoValorSort,
} from '../../shared/types/IntegrimNotas'
import { useAuthStore, usePrevisaoComprasStore } from '../stores'

// Componentes do Layout e Gerais
import LayoutAppPageShell from '../components/layout/AppPageShell.vue'
import StockIntegrinActions from '../components/stock-integrin/StockIntegrinActions.vue'
import StockIntegrinNotices from '../components/stock-integrin/StockIntegrinNotices.vue'
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger.vue'

// Componentes Exclusivos da Página de Previsão de Compras
import PrevisaoComprasStatsGrid from '../components/previsao-compras/PrevisaoComprasStatsGrid.vue'
import PrevisaoComprasFilters from '../components/previsao-compras/PrevisaoComprasFilters.vue'
import PrevisaoComprasProgress from '../components/previsao-compras/PrevisaoComprasProgress.vue'
import PrevisaoComprasHelpTooltip from '../components/previsao-compras/PrevisaoComprasHelpTooltip.vue'
import PrevisaoComprasProductList from '../components/previsao-compras/PrevisaoComprasProductList.vue'
import PrevisaoComprasDetailModal from '../components/previsao-compras/PrevisaoComprasDetailModal.vue'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()
const store = usePrevisaoComprasStore()

const searchTerm = ref('')
const idempresa = ref('')
const sort = ref<IntegrimProdutoValorSort>('score_valor')
const atualizandoLista = ref(false)
const produtoSelecionado = ref<IntegrimProdutoValor | null>(null)

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')
const syncEmAndamento = computed(() => store.syncing || store.latestRun?.status === 'running')
const mostrarProgresso = computed(() => syncEmAndamento.value)

const produtoModalAberto = computed({
  get: () => Boolean(produtoSelecionado.value),
  set: (value: boolean) => {
    if (!value) produtoSelecionado.value = null
  },
})

const filtrosAtuais = (pageToLoad = 1) => ({
  search: searchTerm.value.trim(),
  idempresa: idempresa.value || undefined,
  sort: sort.value,
  page: pageToLoad,
  page_size: store.pageSize,
})

const carregarProdutos = async (options: { append?: boolean, page?: number } = {}) => {
  const append = Boolean(options.append)
  const pageToLoad = options.page || (append ? store.page + 1 : 1)
  if (append && (store.loadingProdutos || pageToLoad > store.totalPaginas)) return
  await store.fetchProdutos(filtrosAtuais(pageToLoad), { append })
}

const aplicarFiltros = async () => {
  await carregarProdutos()
}

const carregarMais = async () => {
  if (store.loadingProdutos || !produtosTemMais.value) return
  await carregarProdutos({ append: true, page: store.page + 1 })
}

const sincronizarAgora = async () => {
  if (import.meta.client) {
    const confirmed = window.confirm('Sincronizar baixa as notas fiscais das 6 empresas direto na Integrim e recalcula a analise. A rotina pode levar alguns minutos. Continuar?')
    if (!confirmed) return
  }
  const result = await store.syncNow()
  if (result) await carregarProdutos()
}

const atualizarLista = async () => {
  atualizandoLista.value = true
  try {
    await carregarProdutos()
  }
  finally {
    atualizandoLista.value = false
  }
}

const pararSincronizacao = async () => {
  if (import.meta.client) {
    const confirmed = window.confirm('Parar a sincronizacao das notas do Integrim? Ela encerra no proximo lote seguro.')
    if (!confirmed) return
  }
  await store.cancelSync()
}

const abrirDetalhe = (produto: IntegrimProdutoValor) => {
  produtoSelecionado.value = produto
}

const produtosTemMais = computed(() => store.produtos.length < store.totalItens && store.page < store.totalPaginas)
const produtosLoadingInicial = computed(() => store.loadingProdutos && !store.produtos.length)
const produtosLoadingMais = computed(() => store.loadingProdutos && store.produtos.length > 0)

onMounted(async () => {
  if (!authStore.profile) await authStore.getMe()
  await Promise.all([
    store.fetchSyncStatus(),
    carregarProdutos(),
  ])
  store.resumeSyncTrackingIfRunning()
})
</script>

<template>
  <LayoutAppPageShell
    eyebrow="Previsão de Compras"
    title="O que vale a pena comprar"
    description="Mostra quais produtos mais vendem e geram lucro, e quais estão perto de acabar, para você decidir as compras."
  >
    <!-- Ações de Header -->
    <template #headerAside>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <!-- Tooltip com legenda das métricas ao passar o mouse -->
        <PrevisaoComprasHelpTooltip />
        
        <StockIntegrinActions
          :is-admin="isAdmin"
          :sync-in-progress="syncEmAndamento"
          :cancelling="store.cancelling"
          :loading-produtos="store.loadingProdutos"
          :refreshing="atualizandoLista"
          @sync-now="sincronizarAgora"
          @cancel-sync="pararSincronizacao"
          @refresh="atualizarLista"
        />
      </div>
    </template>

    <div class="space-y-5">
      <!-- Notificações de Erro/Sucesso -->
      <StockIntegrinNotices
        :readonly-mode="!isAdmin"
        :error-message="store.errorMessage"
        :success-message="store.successMessage"
      />

      <!-- Barra de Progresso de Sincronização -->
      <PrevisaoComprasProgress
        v-if="mostrarProgresso"
        :progress="store.syncProgress"
        :syncing="store.syncing"
        :percent="store.syncProgressPercent"
      />

      <!-- Grid de Resumos KPIs -->
      <PrevisaoComprasStatsGrid :stats="store.stats" />

      <!-- Painel de Filtros e Busca -->
      <PrevisaoComprasFilters
        :search-term="searchTerm"
        :idempresa="idempresa"
        :sort="sort"
        :loading="store.loadingProdutos"
        @update:search-term="searchTerm = $event"
        @update:idempresa="idempresa = $event"
        @update:sort="sort = $event"
        @apply="aplicarFiltros"
      />

      <!-- Listagem de Produtos em Formato de Tabela Normal -->
      <PrevisaoComprasProductList
        :produtos="store.produtos"
        :loading-initial="produtosLoadingInicial"
        :is-admin="isAdmin"
        @select="abrirDetalhe"
      />

      <!-- Trigger de Scroll Infinito -->
      <InfiniteScrollTrigger
        v-slot:default
        v-if="store.produtos.length"
        :loading="produtosLoadingMais"
        :done="!produtosTemMais"
        :loaded-count="store.produtos.length"
        :total="store.totalItens"
        label="produtos"
        done-label="Todos os produtos foram carregados."
        @load-more="carregarMais"
      />
    </div>

    <!-- Modal Detalhado do Item -->
    <PrevisaoComprasDetailModal
      v-model="produtoModalAberto"
      :produto="produtoSelecionado"
    />
  </LayoutAppPageShell>
</template>
