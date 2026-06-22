<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BarChart3, Bot, Lightbulb, Settings2 } from 'lucide-vue-next'
import type {
  IntegrimAbcMetric,
  IntegrimCompraAiTaskUpsertRequest,
  IntegrimCompraOportunidadeStatus,
  IntegrimCompraParametrosUpdateRequest,
  IntegrimProdutoOportunidadeFilter,
  IntegrimProdutoValor,
  IntegrimProdutoValorSort,
  IntegrimSyncScheduleUpdateRequest,
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
import PrevisaoComprasAiWorkspace from '../components/previsao-compras/PrevisaoComprasAiWorkspace.vue'
import PrevisaoComprasCoverageBanner from '../components/previsao-compras/PrevisaoComprasCoverageBanner.vue'
import PrevisaoComprasInsights from '../components/previsao-compras/PrevisaoComprasInsights.vue'
import PrevisaoComprasConfig from '../components/previsao-compras/PrevisaoComprasConfig.vue'

definePageMeta({
  middleware: 'auth',
})

type PrevisaoComprasTab = 'matematica' | 'ia' | 'insights' | 'config'

const authStore = useAuthStore()
const store = usePrevisaoComprasStore()

const activeTab = ref<PrevisaoComprasTab>('matematica')
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

const carregarPainelIa = async () => {
  await store.fetchAiDashboard()
}

const carregarConfig = async () => {
  await Promise.all([
    store.fetchSyncSchedule(),
    store.fetchSyncHealth(),
    store.fetchCompraParametros({ silent: true }),
  ])
}

const insightsQueryBase = () => ({
  idempresa: idempresa.value || undefined,
  date_start: dateStart.value || null,
  date_end: dateEnd.value || null,
  page_size: 100,
})

const carregarRuptura = () => store.fetchRuptura(insightsQueryBase())
const carregarAbc = (metric: IntegrimAbcMetric) => store.fetchAbc({ ...insightsQueryBase(), metric })
const carregarSazonalidade = () => store.fetchSazonalidade({ idempresa: idempresa.value || undefined })

const salvarAgenda = async (payload: IntegrimSyncScheduleUpdateRequest) => {
  await store.updateSyncSchedule(payload)
}
const salvarParametros = async (payload: IntegrimCompraParametrosUpdateRequest) => {
  await store.updateCompraParametros(payload)
}

const selecionarAba = async (tab: PrevisaoComprasTab) => {
  activeTab.value = tab
  if (tab === 'ia' && !store.aiDashboard && !store.loadingAiDashboard) {
    await carregarPainelIa()
  }
  else if (tab === 'config') {
    await carregarConfig()
  }
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

const sincronizarPeriodo = async (payload: { date_start: string, date_end: string }) => {
  if (import.meta.client) {
    const confirmed = window.confirm(`Sincronizar as vendas de ${payload.date_start} até ${payload.date_end} das 6 empresas e recalcular a análise. Pode levar alguns minutos. Continuar?`)
    if (!confirmed) return
  }
  const result = await store.syncNow({ date_start: payload.date_start, date_end: payload.date_end })
  if (result) await carregarProdutos()
}

const atualizarLista = async () => {
  atualizandoLista.value = true
  try {
    if (activeTab.value === 'ia') await carregarPainelIa()
    else if (activeTab.value === 'config') await carregarConfig()
    else if (activeTab.value === 'insights') await carregarRuptura()
    else await carregarProdutos()
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

const atualizarOportunidade = async (input: {
  id: string
  status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>
}) => {
  const result = await store.updateOportunidadeStatus(input.id, input.status)
  if (!result) return

  if (produtoSelecionado.value?.ai_oportunidade && produtoSelecionado.value.ai_oportunidade.id === input.id) {
    produtoSelecionado.value = {
      ...produtoSelecionado.value,
      ai_oportunidade: {
        ...produtoSelecionado.value.ai_oportunidade,
        status: result.status,
      },
    }
  }

  if (activeTab.value === 'ia') await store.fetchAiDashboard({ silent: true })
}

const criarTaskIa = async (payload: IntegrimCompraAiTaskUpsertRequest) => {
  await store.createAiTask(payload)
}

const atualizarTaskIa = async (id: string, payload: IntegrimCompraAiTaskUpsertRequest) => {
  await store.updateAiTask(id, payload)
}

const rodarTaskIa = async (taskId: string | null) => {
  const result = await store.runAiTask(taskId)
  if (result?.status === 'success') await carregarProdutos()
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

      <!-- Barra de Progresso da IA de Previsão de Compras -->
      <PrevisaoComprasProgress
        v-if="store.aiTaskRunning"
        :progress="{ message: store.aiTaskProgressMessage, detail: store.aiTaskProgressDetail }"
        :syncing="true"
        :percent="store.aiTaskProgressPercent"
      />

      <div class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <button
          type="button"
          class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition sm:flex-none"
          :class="activeTab === 'matematica'
            ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="selecionarAba('matematica')"
        >
          <BarChart3 class="h-4 w-4" />
          Estatisticas
        </button>
        <button
          type="button"
          class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition sm:flex-none"
          :class="activeTab === 'insights'
            ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="selecionarAba('insights')"
        >
          <Lightbulb class="h-4 w-4" />
          Insights
        </button>
        <button
          type="button"
          class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition sm:flex-none"
          :class="activeTab === 'ia'
            ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="selecionarAba('ia')"
        >
          <Bot class="h-4 w-4" />
          IA e tasks
        </button>
        <button
          type="button"
          class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition sm:flex-none"
          :class="activeTab === 'config'
            ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="selecionarAba('config')"
        >
          <Settings2 class="h-4 w-4" />
          Agenda & Saúde
        </button>
      </div>

      <template v-if="activeTab === 'matematica'">
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
      </template>

      <PrevisaoComprasInsights
        v-else-if="activeTab === 'insights'"
        :abc="store.abc"
        :ruptura="store.ruptura"
        :sazonalidade="store.sazonalidade"
        :loading="store.loadingInsights"
        @load-ruptura="carregarRuptura"
        @load-abc="carregarAbc"
        @load-sazonalidade="carregarSazonalidade"
      />

      <PrevisaoComprasConfig
        v-else-if="activeTab === 'config'"
        :schedule="store.schedule"
        :health="store.health"
        :parametros="store.compraParametros"
        :is-admin="isAdmin"
        :saving="store.savingConfig"
        :syncing="syncEmAndamento"
        @save-schedule="salvarAgenda"
        @save-parametros="salvarParametros"
        @sync-periodo="sincronizarPeriodo"
        @refresh="store.fetchSyncHealth"
      />

      <PrevisaoComprasAiWorkspace
        v-else
        :dashboard="store.aiDashboard"
        :loading="store.loadingAiDashboard"
        :action-loading="store.aiActionLoading"
        :is-admin="isAdmin"
        @refresh="carregarPainelIa"
        @create-task="criarTaskIa"
        @update-task="atualizarTaskIa"
        @run-task="rodarTaskIa"
        @opportunity-action="atualizarOportunidade"
      />
    </div>

    <!-- Modal Detalhado do Item -->
    <PrevisaoComprasDetailModal
      v-model="produtoModalAberto"
      :produto="produtoSelecionado"
      @opportunity-action="atualizarOportunidade"
    />
  </LayoutAppPageShell>
</template>
