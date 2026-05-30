<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore, useStockIntegrinStore } from '../stores'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()
const stockStore = useStockIntegrinStore()

const searchTerm = ref('')
const appliedSearchTerm = ref('')
const idempresa = ref('')
const onlyAvailable = ref(false)
const itensPorPagina = ref(50)
const atualizandoLista = ref(false)
let resetSearchTimer: ReturnType<typeof setTimeout> | null = null

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')
const syncEmAndamento = computed(() => stockStore.syncing || stockStore.latestRun?.status === 'running')

const filtrosAtuais = (pageToLoad = 1) => ({
  search: appliedSearchTerm.value,
  idempresa: idempresa.value || undefined,
  only_available: onlyAvailable.value,
  page: pageToLoad,
  page_size: itensPorPagina.value,
})

const carregarProdutos = async (options: { append?: boolean; page?: number } = {}) => {
  const append = Boolean(options.append)
  const pageToLoad = options.page || (append ? stockStore.page + 1 : 1)

  if (append && (stockStore.loadingProdutos || pageToLoad > stockStore.totalPaginas)) return

  await stockStore.fetchProdutos(filtrosAtuais(pageToLoad), { append })
}

const aplicarFiltros = async () => {
  const nextSearch = searchTerm.value.trim()
  appliedSearchTerm.value = nextSearch
  searchTerm.value = nextSearch
  await carregarProdutos()
}

const resetarFiltroTexto = async () => {
  if (!appliedSearchTerm.value) return

  appliedSearchTerm.value = ''
  await carregarProdutos()
}

const carregarMaisProdutos = async () => {
  if (stockStore.loadingProdutos || !produtosTemMais.value) return

  await carregarProdutos({
    append: true,
    page: stockStore.page + 1,
  })
}

const sincronizarAgora = async () => {
  if (import.meta.client) {
    const confirmed = window.confirm('Sincronizar busca os saldos direto na Integrim e atualiza a base local. A rotina pode levar alguns minutos. Continuar?')
    if (!confirmed) return
  }

  const result = await stockStore.syncNow()
  if (result) {
    await carregarProdutos()
  }
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
    const confirmed = window.confirm('Parar a sincronizacao do Stock Integrin? Ela vai encerrar no proximo lote seguro.')
    if (!confirmed) return
  }

  await stockStore.cancelSync()
}

const produtosTemMais = computed(() => stockStore.produtos.length < stockStore.totalItens && stockStore.page < stockStore.totalPaginas)
const produtosLoadingInicial = computed(() => stockStore.loadingProdutos && !stockStore.produtos.length)
const produtosLoadingMais = computed(() => stockStore.loadingProdutos && stockStore.produtos.length > 0)
const mostrarProgressoSync = computed(() => syncEmAndamento.value)
const progressoSync = computed(() => stockStore.syncProgress)
const progressoPercentual = computed(() => stockStore.syncProgressPercent)

watch(searchTerm, (value) => {
  if (resetSearchTimer) {
    clearTimeout(resetSearchTimer)
    resetSearchTimer = null
  }

  if (value.trim() || !appliedSearchTerm.value) return

  resetSearchTimer = setTimeout(() => {
    resetSearchTimer = null
    void resetarFiltroTexto()
  }, 250)
})

onMounted(async () => {
  if (!authStore.profile) {
    await authStore.getMe()
  }

  await Promise.all([
    stockStore.fetchSyncStatus(),
    carregarProdutos(),
  ])
})

onBeforeUnmount(() => {
  if (resetSearchTimer) {
    clearTimeout(resetSearchTimer)
  }
})
</script>

<template>
  <LayoutAppPageShell
    eyebrow="Stock Integrin"
    title="Estoque Integrim"
    description="Sincronize, filtre e acompanhe os produtos integrados."
  >
    <template #headerAside>
      <StockIntegrinActions
        :is-admin="isAdmin"
        :sync-in-progress="syncEmAndamento"
        :cancelling="stockStore.cancelling"
        :loading-produtos="stockStore.loadingProdutos"
        :refreshing="atualizandoLista"
        @sync-now="sincronizarAgora"
        @cancel-sync="pararSincronizacao"
        @refresh="atualizarLista"
      />
    </template>

    <div class="space-y-4">
      <StockIntegrinNotices
        :readonly-mode="!isAdmin"
        :error-message="stockStore.errorMessage"
        :success-message="stockStore.successMessage"
      />

      <StockIntegrinProgress
        v-if="mostrarProgressoSync"
        :progress="progressoSync"
        :syncing="stockStore.syncing"
        :percent="progressoPercentual"
      />

      <StockIntegrinStatsGrid
        :total-itens="stockStore.totalItens"
        :stats="stockStore.stats"
        :latest-status="stockStore.latestRun?.status"
      />

      <StockIntegrinFilters
        :search-term="searchTerm"
        :idempresa="idempresa"
        :only-available="onlyAvailable"
        :empresas="stockStore.stats.empresas"
        :loading="stockStore.loadingProdutos"
        @update:search-term="searchTerm = $event"
        @update:idempresa="idempresa = $event"
        @update:only-available="onlyAvailable = $event"
        @apply="aplicarFiltros"
      />

      <StockIntegrinProductList
        :produtos="stockStore.produtos"
        :loading-initial="produtosLoadingInicial"
      />

      <InfiniteScrollTrigger
        v-if="stockStore.produtos.length"
        :loading="produtosLoadingMais"
        :done="!produtosTemMais"
        :loaded-count="stockStore.produtos.length"
        :total="stockStore.totalItens"
        label="produtos"
        done-label="Todos os produtos foram carregados."
        @load-more="carregarMaisProdutos"
      />
    </div>
  </LayoutAppPageShell>
</template>
