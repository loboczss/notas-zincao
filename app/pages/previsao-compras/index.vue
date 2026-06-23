<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BarChart3, Lightbulb, ShoppingCart } from 'lucide-vue-next'
import { useAuthStore, usePrevisaoComprasStore } from '../../stores'
import type {
  IntegrimAbcMetric,
  IntegrimListaCompraQuery,
  IntegrimProdutoOportunidadeFilter,
  IntegrimProdutoValor,
  IntegrimProdutoValorSort,
} from '../../../shared/types/IntegrimNotas'

// Mode 1: Comprar
import PrevisaoComprasListaCompra from '../../components/previsao-compras/core/PrevisaoComprasListaCompra.vue'

// Mode 2: Estatísticas
import PrevisaoComprasStatsGrid from '../../components/previsao-compras/core/PrevisaoComprasStatsGrid.vue'
import PrevisaoComprasCoverageBanner from '../../components/previsao-compras/core/PrevisaoComprasCoverageBanner.vue'
import PrevisaoComprasFilters from '../../components/previsao-compras/core/PrevisaoComprasFilters.vue'
import PrevisaoComprasProductList from '../../components/previsao-compras/core/PrevisaoComprasProductList.vue'
import InfiniteScrollTrigger from '../../components/InfiniteScrollTrigger.vue'

// Mode 3: Insights
import PrevisaoComprasInsights from '../../components/previsao-compras/insights/PrevisaoComprasInsights.vue'

const authStore = useAuthStore()
const store = usePrevisaoComprasStore()

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

// --- MODE SELECTOR ---
const activeMode = computed({
  get: () => store.indexTabMode,
  set: (val) => {
    store.indexTabMode = val
  }
})

// --- MODE 1: COMPRAR LOGIC ---
const carregarListaCompra = (query: IntegrimListaCompraQuery = {}) => {
  return store.fetchListaCompra(query)
}

// --- MODE 2: ESTATÍSTICAS (TODOS OS PRODUTOS) LOGIC ---
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

// --- MODE 3: INSIGHTS LOGIC ---
const fetchRuptura = () => store.fetchRuptura()
const fetchAbc = (metric: IntegrimAbcMetric) => store.fetchAbc({ metric })
const fetchSazonalidade = () => store.fetchSazonalidade()

// --- INITIAL LOAD & WATCHERS ---
const loadDataForActiveMode = async () => {
  if (activeMode.value === 'sugestoes') {
    if (!store.listaCompra.length && !store.loadingListaCompra) {
      await carregarListaCompra()
    }
  } else if (activeMode.value === 'todos') {
    if (!store.produtos.length && !store.loadingProdutos) {
      await carregarProdutos()
    }
  } else if (activeMode.value === 'insights') {
    if (!store.ruptura && !store.loadingInsights) {
      await Promise.all([
        fetchRuptura(),
        fetchAbc('faturamento'),
        fetchSazonalidade(),
      ])
    }
  }
}

watch(activeMode, () => {
  loadDataForActiveMode()
})

onMounted(async () => {
  if (!authStore.profile) await authStore.getMe()
  await loadDataForActiveMode()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Seletor de Modo Interno Minimalista -->
    <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-xs dark:border-slate-800 dark:bg-slate-900/50 w-fit max-w-full overflow-x-auto scrollbar-none whitespace-nowrap">
      <button
        type="button"
        class="inline-flex min-h-8 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition select-none outline-none"
        :class="activeMode === 'sugestoes'
          ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
          : 'text-slate-550 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/60'"
        @click="activeMode = 'sugestoes'"
      >
        <ShoppingCart class="h-3.5 w-3.5" />
        Sugestões de Compra
      </button>
      
      <button
        type="button"
        class="inline-flex min-h-8 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition select-none outline-none"
        :class="activeMode === 'todos'
          ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
          : 'text-slate-550 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/60'"
        @click="activeMode = 'todos'"
      >
        <BarChart3 class="h-3.5 w-3.5" />
        Todos os Produtos
      </button>

      <button
        type="button"
        class="inline-flex min-h-8 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition select-none outline-none"
        :class="activeMode === 'insights'
          ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
          : 'text-slate-550 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800/60'"
        @click="activeMode = 'insights'"
      >
        <Lightbulb class="h-3.5 w-3.5" />
        Gráficos e Insights
      </button>
    </div>

    <!-- MODO 1: SUGESTÕES DE COMPRA -->
    <div v-if="activeMode === 'sugestoes'" class="animate-fade-in">
      <PrevisaoComprasListaCompra
        :rows="store.listaCompra"
        :stats="store.listaCompraStats"
        :loading="store.loadingListaCompra"
        :total-itens="store.listaCompraTotalItens"
        @fetch="carregarListaCompra"
      />
    </div>

    <!-- MODO 2: TODOS OS PRODUTOS (ESTATÍSTICAS) -->
    <div v-else-if="activeMode === 'todos'" class="space-y-5 animate-fade-in">
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

      <!-- Listagem de Produtos -->
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

    <!-- MODO 3: GRÁFICOS E INSIGHTS -->
    <div v-else-if="activeMode === 'insights'" class="animate-fade-in">
      <PrevisaoComprasInsights
        :abc="store.abc"
        :ruptura="store.ruptura"
        :sazonalidade="store.sazonalidade"
        :loading="store.loadingInsights"
        @load-ruptura="fetchRuptura"
        @load-abc="fetchAbc"
        @load-sazonalidade="fetchSazonalidade"
      />
    </div>
  </div>
</template>
