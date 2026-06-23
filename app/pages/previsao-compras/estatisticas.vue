<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore, usePrevisaoComprasStore } from '../../stores'
import type {
  IntegrimProdutoOportunidadeFilter,
  IntegrimProdutoValor,
  IntegrimProdutoValorSort,
} from '../../../shared/types/IntegrimNotas'

import PrevisaoComprasStatsGrid from '../../components/previsao-compras/core/PrevisaoComprasStatsGrid.vue'
import PrevisaoComprasCoverageBanner from '../../components/previsao-compras/core/PrevisaoComprasCoverageBanner.vue'
import PrevisaoComprasFilters from '../../components/previsao-compras/core/PrevisaoComprasFilters.vue'
import PrevisaoComprasProductList from '../../components/previsao-compras/core/PrevisaoComprasProductList.vue'
import InfiniteScrollTrigger from '../../components/InfiniteScrollTrigger.vue'

const authStore = useAuthStore()
const store = usePrevisaoComprasStore()

const searchTerm = ref('')
let searchDebounceTimeout: any = null
const handleSearchUpdate = (val: string) => {
  searchTerm.value = val
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout)
  }
  searchDebounceTimeout = setTimeout(() => {
    aplicarFiltros()
  }, 400)
}

const idempresa = ref('')
const sort = ref<IntegrimProdutoValorSort>('score_valor')
const periodPreset = ref('90')
const dateStart = ref('')
const dateEnd = ref('')
const coverageDays = ref('45')
const comparePrevious = ref(true)
const oportunidadeFilter = ref<IntegrimProdutoOportunidadeFilter>('all')

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const formatDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const setQuickPeriod = (days: number) => {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - Math.max(1, days) + 1)
  dateStart.value = formatDateInput(start)
  dateEnd.value = formatDateInput(end)
  periodPreset.value = String(days)
}

// Configura período padrão inicial
setQuickPeriod(90)

const filtrosAtuais = (pageToLoad = 1) => ({
  search: searchTerm.value.trim(),
  idempresa: idempresa.value || undefined,
  sort: sort.value,
  page: pageToLoad,
  page_size: store.pageSize,
  date_start: dateStart.value || null,
  date_end: dateEnd.value || null,
  coverage_days: coverageDays.value,
  compare_previous: comparePrevious.value,
  oportunidade_filter: oportunidadeFilter.value,
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

const abrirDetalhe = (produto: IntegrimProdutoValor) => {
  store.produtoSelecionado = produto
}

const produtosTemMais = computed(() => store.produtos.length < store.totalItens && store.page < store.totalPaginas)
const produtosLoadingInicial = computed(() => store.loadingProdutos && !store.produtos.length)
const produtosLoadingMais = computed(() => store.loadingProdutos && store.produtos.length > 0)

onMounted(async () => {
  if (!authStore.profile) await authStore.getMe()
  if (!store.produtos.length) {
    await carregarProdutos()
  }
})
</script>

<template>
  <div class="space-y-5">
    <!-- Grid de Resumos KPIs -->
    <PrevisaoComprasStatsGrid :stats="store.stats" />

    <!-- Aviso de cobertura de dados para o periodo escolhido -->
    <PrevisaoComprasCoverageBanner :coverage="store.coverage" />

    <!-- Painel de Filtros e Busca -->
    <PrevisaoComprasFilters
      :search-term="searchTerm"
      :idempresa="idempresa"
      :sort="sort"
      :period-preset="periodPreset"
      :date-start="dateStart"
      :date-end="dateEnd"
      :coverage-days="coverageDays"
      :compare-previous="comparePrevious"
      :oportunidade-filter="oportunidadeFilter"
      :loading="store.loadingProdutos"
      @update:search-term="handleSearchUpdate"
      @update:idempresa="idempresa = $event"
      @update:sort="sort = $event"
      @update:period-preset="periodPreset = $event"
      @update:date-start="dateStart = $event; periodPreset = 'custom'"
      @update:date-end="dateEnd = $event; periodPreset = 'custom'"
      @update:coverage-days="coverageDays = $event"
      @update:compare-previous="comparePrevious = $event"
      @update:oportunidade-filter="oportunidadeFilter = $event"
      @quick-period="setQuickPeriod"
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
</template>
