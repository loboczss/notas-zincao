<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { StockIntegrinProduto } from '../../shared/types/StockIntegrin'
import { useAuthStore, useStockIntegrinStore } from '../stores'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinDate,
  formatStockIntegrinNumber,
  stockIntegrinProductSubtitle,
} from '../utils/stock-integrin-format'

type ProdutoDetalheItem = {
  label: string
  value: string
}

type ProdutoDetalheSection = {
  title: string
  items: ProdutoDetalheItem[]
}

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
const produtoSelecionado = ref<StockIntegrinProduto | null>(null)
let resetSearchTimer: ReturnType<typeof setTimeout> | null = null

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')
const syncEmAndamento = computed(() => stockStore.syncing || stockStore.latestRun?.status === 'running')
const produtoModalAberto = computed({
  get: () => Boolean(produtoSelecionado.value),
  set: (value: boolean) => {
    if (!value) {
      produtoSelecionado.value = null
    }
  },
})

const formatarDetalhe = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao'

  return String(value)
}

const formatarFlag = (value: string | null) => {
  const normalized = String(value || '').trim().toUpperCase()
  if (!normalized) return '-'
  if (['S', 'SIM', 'TRUE', '1'].includes(normalized)) return 'Sim'
  if (['N', 'NAO', 'FALSE', '0'].includes(normalized)) return 'Nao'

  return normalized
}

const formatarMoedaOpcional = (value: number | null) => {
  if (value === null || value === undefined) return '-'

  return formatStockIntegrinCurrency(value)
}

const produtoTituloModal = computed(() => produtoSelecionado.value?.descrcomproduto || 'Detalhes do produto')
const produtoDescricaoModal = computed(() => {
  if (!produtoSelecionado.value) return ''

  return stockIntegrinProductSubtitle(produtoSelecionado.value)
})

const produtoResumoModal = computed<ProdutoDetalheItem[]>(() => {
  const produto = produtoSelecionado.value
  if (!produto) return []

  return [
    { label: 'Disponivel', value: formatStockIntegrinNumber(produto.qtdsaldodisponivel) },
    { label: 'Atual', value: formatStockIntegrinNumber(produto.qtdsaldoatual) },
    { label: 'Reserva', value: formatStockIntegrinNumber(produto.qtdsaldoreserva) },
  ]
})

const produtoDetalheSections = computed<ProdutoDetalheSection[]>(() => {
  const produto = produtoSelecionado.value
  if (!produto) return []

  return [
    {
      title: 'Identificacao',
      items: [
        { label: 'ID interno', value: formatarDetalhe(produto.id) },
        { label: 'Empresa', value: formatarDetalhe(produto.idempresa) },
        { label: 'Produto', value: formatarDetalhe(produto.idproduto) },
        { label: 'Subproduto', value: formatarDetalhe(produto.idsubproduto) },
        { label: 'ID local estoque', value: formatarDetalhe(produto.idlocalestoque) },
        { label: 'Local estoque', value: formatarDetalhe(produto.descrlocalestoque) },
      ],
    },
    {
      title: 'Descricao e classificacao',
      items: [
        { label: 'Descricao completa', value: formatarDetalhe(produto.descrcomproduto) },
        { label: 'Descricao resumida', value: formatarDetalhe(produto.descrresproduto) },
        { label: 'Codigo de barras', value: formatarDetalhe(produto.nrcodbarprod) },
        { label: 'NCM', value: formatarDetalhe(produto.ncm) },
        { label: 'Embalagem saida', value: formatarDetalhe(produto.embalagem_saida) },
        { label: 'Secao', value: formatarDetalhe(produto.descrsecao) },
        { label: 'Grupo', value: formatarDetalhe(produto.descrgrupo) },
        { label: 'Subgrupo', value: formatarDetalhe(produto.descrsubgrupo) },
      ],
    },
    {
      title: 'Saldo e estoque',
      items: [
        { label: 'Saldo disponivel', value: formatStockIntegrinNumber(produto.qtdsaldodisponivel) },
        { label: 'Saldo atual', value: formatStockIntegrinNumber(produto.qtdsaldoatual) },
        { label: 'Saldo reserva', value: formatStockIntegrinNumber(produto.qtdsaldoreserva) },
        { label: 'Lote', value: formatarFlag(produto.flaglote) },
        { label: 'Estoque negativo', value: formatarFlag(produto.flagestnegativo) },
        { label: 'Inativo', value: formatarFlag(produto.flaginativo) },
        { label: 'Presente na Integrim', value: formatarDetalhe(produto.is_present) },
      ],
    },
    {
      title: 'Precos',
      items: [
        { label: 'Preco varejo', value: formatarMoedaOpcional(produto.valprecovarejo) },
        { label: 'Preco promocional', value: formatarMoedaOpcional(produto.valpromvarejo) },
        { label: 'Custo reposicao', value: formatarMoedaOpcional(produto.valcustorepos) },
        { label: 'Custo gerencial', value: formatarMoedaOpcional(produto.custogerencial) },
        { label: 'Custo nota fiscal', value: formatarMoedaOpcional(produto.custonotafiscal) },
      ],
    },
    {
      title: 'Datas e sincronizacao',
      items: [
        { label: 'Alteracao cadastro produto', value: formatStockIntegrinDate(produto.cad_produto_dtalteracao) },
        { label: 'Alteracao preco custo', value: formatStockIntegrinDate(produto.preco_custo_dtalteracao) },
        { label: 'Alteracao estoque', value: formatStockIntegrinDate(produto.estoque_dtalteracao) },
        { label: 'Atualizado na Integrim', value: formatStockIntegrinDate(produto.integrim_updated_at) },
        { label: 'Ultima vez visto', value: formatStockIntegrinDate(produto.last_seen_at) },
        { label: 'Criado em', value: formatStockIntegrinDate(produto.created_at) },
        { label: 'Atualizado em', value: formatStockIntegrinDate(produto.updated_at) },
        { label: 'Sync run ID', value: formatarDetalhe(produto.sync_run_id) },
      ],
    },
  ]
})

const produtoLocaisEstoque = computed(() => produtoSelecionado.value?.locais_estoque || [])

const abrirDetalheProduto = (produto: StockIntegrinProduto) => {
  produtoSelecionado.value = produto
}

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

  // Se ja houver uma sincronizacao em andamento (iniciada antes ou em outra aba),
  // retoma o acompanhamento do progresso.
  stockStore.resumeSyncTrackingIfRunning()
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
        @select="abrirDetalheProduto"
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

    <ModalGlobal
      v-model="produtoModalAberto"
      :title="produtoTituloModal"
      :description="produtoDescricaoModal"
      max-width-class="max-w-6xl"
      content-class="p-0"
    >
      <div v-if="produtoSelecionado" class="space-y-5 p-5 md:p-6">
        <div class="grid gap-3 md:grid-cols-3">
          <div
            v-for="item in produtoResumoModal"
            :key="item.label"
            class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60"
          >
            <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              {{ item.label }}
            </p>
            <p class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">
              {{ item.value }}
            </p>
          </div>
        </div>

        <section
          v-for="section in produtoDetalheSections"
          :key="section.title"
          class="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <header class="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
              {{ section.title }}
            </h3>
          </header>

          <dl class="grid gap-x-4 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="item in section.items" :key="item.label" class="min-w-0">
              <dt class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {{ item.label }}
              </dt>
              <dd class="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </section>

        <section
          class="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <header class="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
              Locais de estoque
            </h3>
          </header>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
              <thead class="bg-slate-100 text-xs font-bold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th class="px-4 py-3">ID</th>
                  <th class="px-4 py-3">Local</th>
                  <th class="px-4 py-3 text-right">Disponivel</th>
                  <th class="px-4 py-3 text-right">Atual</th>
                  <th class="px-4 py-3 text-right">Reserva</th>
                  <th class="px-4 py-3">Lote</th>
                  <th class="px-4 py-3">Estoque negativo</th>
                  <th class="px-4 py-3">Inativo</th>
                  <th class="px-4 py-3">Atualizado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr v-for="local in produtoLocaisEstoque" :key="local.idlocalestoque">
                  <td class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                    {{ local.idlocalestoque }}
                  </td>
                  <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {{ local.descrlocalestoque || '-' }}
                  </td>
                  <td class="px-4 py-3 text-right font-bold text-slate-950 dark:text-slate-50">
                    {{ formatStockIntegrinNumber(local.qtdsaldodisponivel) }}
                  </td>
                  <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                    {{ formatStockIntegrinNumber(local.qtdsaldoatual) }}
                  </td>
                  <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                    {{ formatStockIntegrinNumber(local.qtdsaldoreserva) }}
                  </td>
                  <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {{ formatarFlag(local.flaglote) }}
                  </td>
                  <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {{ formatarFlag(local.flagestnegativo) }}
                  </td>
                  <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {{ formatarFlag(local.flaginativo) }}
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {{ formatStockIntegrinDate(local.dtalteracao) }}
                  </td>
                </tr>

                <tr v-if="!produtoLocaisEstoque.length">
                  <td colspan="9" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Nenhum local de estoque informado.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ModalGlobal>
  </LayoutAppPageShell>
</template>
