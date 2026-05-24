<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { AlertTriangle, Pencil, Save, Trash2, XCircle } from 'lucide-vue-next'
import type { NotaAdminEditRequest, NotaRetiradaStatus } from '../../../shared/types/NotasRetirada'
import AppPageShell from '../../components/layout/AppPageShell.vue'
import InfiniteScrollTrigger from '../../components/InfiniteScrollTrigger.vue'
import ModalGlobal from '../../components/ModalGlobal.vue'
import NotaDetalheModal from '../../components/notas/NotaDetalheModal.vue'
import NotasKpiGrid from '../../components/notas/NotasKpiGrid.vue'
import NotasTabela from '../../components/notas/NotasTabela.vue'
import NotasToolbar from '../../components/notas/NotasToolbar.vue'
import { useAuthStore, useNotasStore } from '../../stores'
import { useToast } from '../../composables/useToast'
import { getApiErrorMessage } from '../../utils/api-errors'
import { getApiAuthHeaders, getApiFetch, getApiUrl } from '../../utils/api-fetch'


definePageMeta({
  middleware: 'auth',
})

const notasStore = useNotasStore()
const authStore = useAuthStore()
const { success: showSuccess, error: showError } = useToast()
const apiFetch = getApiFetch()
const supabaseClient = useSupabaseClient()

notasStore.clearList()

const searchTerm = ref('')
const statusFilter = ref<'todos' | NotaRetiradaStatus>('todos')
const dataInicio = ref('')
const dataFim = ref('')
const paginaAtual = ref(1)
const itensPorPagina = ref(20)
const modalAberto = ref(false)
const notaDetalhe = ref<any | null>(null)
const detalheModalRef = ref<InstanceType<typeof NotaDetalheModal> | null>(null)
const detalheEditMode = ref(false)
const loadingDetalhe = ref(false)
const savingEdicao = ref(false)
const confirmDeleteOpen = ref(false)
const deletingNota = ref(false)
const exportLoading = ref<'csv' | 'pdf' | false>(false)
const pullTracking = ref(false)
const isPulling = ref(false)
const pullRefreshing = ref(false)
const pullStartY = ref(0)
const pullDistance = ref(0)
const filterShell = ref<HTMLElement | null>(null)
const filterSpacerHeight = ref(152)
let filterResizeObserver: ResizeObserver | null = null
const resumoNotas = ref<{
  total_notas: number
  pendentes: number
  parciais: number
  retiradas: number
} | null>(null)
const produtoZinco = ref<{
  saldo_estoque: number
  quantidade_pendente_notas: number
} | null>(null)
const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const carregarResumoNotas = async () => {
  try {
    const response = await apiFetch<{
      success: boolean
      resumo: {
        total_notas: number
        pendentes: number
        parciais: number
        retiradas: number
      }
    }>('/api/dashboard/notas-resumo')

    resumoNotas.value = response?.resumo || null
  }
  catch (err) {
    console.error('[carregarResumoNotas]', err)
    showError(getApiErrorMessage(err, 'Falha ao carregar resumo de notas.'))
  }
}

const carregarZincoDisponivel = async () => {
  try {
    const response = await apiFetch<{
      success: boolean
      produto: {
        saldo_estoque: number
        quantidade_pendente_notas: number
      }
    }>('/api/dashboard/produto-10')

    produtoZinco.value = response?.produto || null
  }
  catch (err) {
    console.error('[carregarZincoDisponivel]', err)
    showError(getApiErrorMessage(err, 'Falha ao carregar saldo de estoque.'))
    produtoZinco.value = null
  }
}

const carregarNotas = async (options: { append?: boolean; page?: number } = {}) => {
  const append = Boolean(options.append)
  const pageToLoad = options.page || (append ? notasStore.page + 1 : 1)

  if (append && (notasStore.loadingNotas || pageToLoad > notasStore.totalPaginas)) return

  if (!append) {
    paginaAtual.value = pageToLoad
  }

  const fetchPromise = notasStore.fetchNotas({
    search: searchTerm.value,
    status: statusFilter.value,
    data_inicio: dataInicio.value,
    data_fim: dataFim.value,
    page: pageToLoad,
    page_size: itensPorPagina.value,
  }, { append })

  if (append) {
    await fetchPromise
  }
  else {
    await Promise.all([
      fetchPromise,
      carregarResumoNotas(),
      carregarZincoDisponivel(),
    ])
  }

  paginaAtual.value = notasStore.page
}

const carregarDetalhe = async (id: string) => {
  loadingDetalhe.value = true
  try {
    notaDetalhe.value = await notasStore.fetchNotaDetalhe(id)
  }
  finally {
    loadingDetalhe.value = false
  }
}

const abrirDetalheNota = async (id: string) => {
  detalheEditMode.value = false
  modalAberto.value = true
  await carregarDetalhe(id)
}

const fecharDetalheNota = () => {
  modalAberto.value = false
  detalheEditMode.value = false
}

const iniciarEdicaoDetalhe = () => {
  detalheModalRef.value?.iniciarEdicao()
}

const cancelarEdicaoDetalhe = () => {
  detalheModalRef.value?.cancelarEdicao()
}

const salvarEdicaoDetalhe = () => {
  detalheModalRef.value?.salvarEdicao()
}

const salvarEdicaoNota = async (payload: NotaAdminEditRequest) => {
  if (!notaDetalhe.value?.id || !isAdmin.value || savingEdicao.value) return

  savingEdicao.value = true
  try {
    await apiFetch(`/api/notas/${notaDetalhe.value.id}/edit`, {
      method: 'PATCH',
      body: payload,
    })

    await carregarDetalhe(notaDetalhe.value.id)
    await carregarNotas()
    showSuccess('Nota atualizada com sucesso!')
  }
  catch (err) {
    console.error('[salvarEdicaoNota]', err)
    showError(err instanceof Error ? err.message : 'Falha ao atualizar nota.')
  }
  finally {
    savingEdicao.value = false
  }
}

const abrirConfirmacaoExclusao = () => {
  if (!notaDetalhe.value?.id || !isAdmin.value || detalheEditMode.value || deletingNota.value) return
  confirmDeleteOpen.value = true
}

const cancelarExclusaoNota = () => {
  if (deletingNota.value) return
  confirmDeleteOpen.value = false
}

const confirmarExclusaoNota = async () => {
  if (!notaDetalhe.value?.id || deletingNota.value) return

  deletingNota.value = true
  try {
    const deleted = await notasStore.deleteNota(notaDetalhe.value.id)

    if (deleted) {
      confirmDeleteOpen.value = false
      fecharDetalheNota()
      await carregarNotas()
    }
  }
  finally {
    deletingNota.value = false
  }
}


const exportarRelatorio = async (format: 'csv' | 'pdf') => {
  if (exportLoading.value) return
  exportLoading.value = format
  try {
    const params = new URLSearchParams({ format })
    if (searchTerm.value) params.set('search', searchTerm.value)
    if (statusFilter.value !== 'todos') params.set('status', statusFilter.value)
    if (dataInicio.value) params.set('data_inicio', dataInicio.value)
    if (dataFim.value) params.set('data_fim', dataFim.value)

    const res = await fetch(getApiUrl(`/api/notas/export?${params.toString()}`), {
      headers: await getApiAuthHeaders(supabaseClient),
    })
    if (!res.ok) throw new Error('Erro ao exportar relatório')

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notas-zincao-${new Date().toISOString().split('T')[0]}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  catch (err) {
    console.error('[exportarRelatorio]', err)
    showError(getApiErrorMessage(err, 'Falha ao exportar relatorio.'))
  }
  finally {
    exportLoading.value = false
  }
}

const updateFilterSpacer = () => {
  const reservedGap = 16
  filterSpacerHeight.value = (filterShell.value?.offsetHeight || 136) + reservedGap
}

onMounted(async () => {
  await nextTick()
  updateFilterSpacer()

  if (import.meta.client) {
    window.addEventListener('resize', updateFilterSpacer)

    if ('ResizeObserver' in window && filterShell.value) {
      filterResizeObserver = new ResizeObserver(updateFilterSpacer)
      filterResizeObserver.observe(filterShell.value)
    }
  }

  await carregarNotas()
})

onUnmounted(() => {
  if (!import.meta.client) return

  window.removeEventListener('resize', updateFilterSpacer)
  filterResizeObserver?.disconnect()
  filterResizeObserver = null
})

const aplicarFiltros = async () => {
  paginaAtual.value = 1
  await carregarNotas()
}

const SEARCH_MIN_CHARS = 3
const SEARCH_DEBOUNCE_MS = 300
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let lastDispatchedSearch = ''

const dispatchSearch = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  if (searchTerm.value === lastDispatchedSearch) return
  lastDispatchedSearch = searchTerm.value
  aplicarFiltros()
}

watch(searchTerm, (value) => {
  const trimmed = value.trim()

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }

  if (trimmed.length === 0) {
    if (lastDispatchedSearch === '') return
    lastDispatchedSearch = ''
    aplicarFiltros()
    return
  }

  if (trimmed.length < SEARCH_MIN_CHARS) return

  searchDebounceTimer = setTimeout(dispatchSearch, SEARCH_DEBOUNCE_MS)
})

onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
})

const irPaginaAnterior = async () => {
  if (paginaAtual.value <= 1 || notasStore.loadingNotas) return
  await carregarNotas({ page: paginaAtual.value - 1 })
}

const irProximaPagina = async () => {
  if (paginaAtual.value >= notasStore.totalPaginas || notasStore.loadingNotas) return
  await carregarNotas({ page: paginaAtual.value + 1 })
}

const mudarItensPorPagina = async (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return
  itensPorPagina.value = Math.min(100, Math.trunc(parsed))
  paginaAtual.value = 1
  await carregarNotas()
}

const carregarMaisNotas = async () => {
  if (notasStore.loadingNotas || !notasTemMais.value) return

  await carregarNotas({
    append: true,
    page: notasStore.page + 1,
  })
}

const pullActivationDistance = 28
const pullThreshold = 72
const pullOffset = computed(() => {
  if (pullRefreshing.value) return 54
  return Math.min(76, Math.round(pullDistance.value * 0.55))
})

const pullReady = computed(() => pullDistance.value >= pullThreshold)
const pullIndicatorVisible = computed(() => isPulling.value || pullRefreshing.value)
const pullContentStyle = computed(() => ({
  transform: `translate3d(0, ${pullOffset.value}px, 0)`,
}))
const pullIndicatorText = computed(() => {
  if (pullRefreshing.value) return 'Atualizando...'
  return pullReady.value ? 'Solte para atualizar' : 'Puxe para atualizar'
})

const isPageAtTop = () => {
  if (!import.meta.client) return false
  return (document.scrollingElement?.scrollTop || window.scrollY || 0) <= 4
}

const handlePullStart = (event: TouchEvent) => {
  if (event.touches.length !== 1 || notasStore.loadingNotas || pullRefreshing.value || !isPageAtTop()) return

  pullStartY.value = event.touches[0]?.clientY || 0
  pullDistance.value = 0
  pullTracking.value = true
  isPulling.value = false
}

const handlePullMove = (event: TouchEvent) => {
  if (!pullTracking.value || event.touches.length !== 1) return

  const currentY = event.touches[0]?.clientY || 0
  const distance = currentY - pullStartY.value

  if (distance <= 0) {
    pullTracking.value = false
    isPulling.value = false
    pullDistance.value = 0
    return
  }

  if (!isPageAtTop()) {
    pullTracking.value = false
    isPulling.value = false
    pullDistance.value = 0
    return
  }

  if (distance < pullActivationDistance) return

  isPulling.value = true
  pullDistance.value = Math.min(distance - pullActivationDistance, 140)
  if (event.cancelable) {
    event.preventDefault()
  }
}

const finishPullRefresh = async () => {
  if (!pullTracking.value && !isPulling.value) return

  const shouldRefresh = pullReady.value
  pullTracking.value = false
  isPulling.value = false

  if (!shouldRefresh) {
    pullDistance.value = 0
    return
  }

  pullRefreshing.value = true
  pullDistance.value = pullThreshold

  try {
    await carregarNotas()
  }
  finally {
    pullRefreshing.value = false
    pullDistance.value = 0
  }
}

const notasFiltradas = computed(() => notasStore.notas)

const intervaloNotas = computed(() => {
  const total = notasStore.totalNotas
  if (!total) {
    return { inicio: 0, fim: 0 }
  }

  return {
    inicio: 1,
    fim: Math.min(notasStore.notas.length, total),
  }
})

const notasTemMais = computed(() => notasStore.notas.length < notasStore.totalNotas && notasStore.page < notasStore.totalPaginas)
const notasLoadingInicial = computed(() => notasStore.loadingNotas && !notasStore.notas.length)
const notasLoadingMais = computed(() => notasStore.loadingNotas && notasStore.notas.length > 0)

// Métricas Reativas
const stats = computed(() => {
  const todas = notasStore.notas
  const resumo = resumoNotas.value

  return {
    total: Number(resumo?.total_notas ?? notasStore.totalNotas),
    pendentes: Number(resumo?.pendentes ?? todas.filter(n => n.status_retirada === 'pendente').length),
    parciais: Number(resumo?.parciais ?? todas.filter(n => n.status_retirada === 'parcial').length),
    concluidas: Number(resumo?.retiradas ?? todas.filter(n => n.status_retirada === 'retirada').length),
    zincoDisponivel: Number(produtoZinco.value?.saldo_estoque || 0),
    valorTotal: todas.reduce((acc, n) => acc + (n.valor_total || 0), 0)
  }
})

</script>

<template>
  <AppPageShell
    title="Notas de Retirada"
    hide-header
  >
    <div class="animate-fade-in font-sans">
      <div :style="{ height: `${filterSpacerHeight}px` }" aria-hidden="true" />

      <div
        ref="filterShell"
        class="fixed inset-x-0 top-16 z-30 bg-slate-50 px-4 pb-3 pt-1 dark:bg-slate-950 md:px-8"
      >
        <div class="mx-auto max-w-7xl">
          <NotasToolbar
            :search-term="searchTerm"
            :status-filter="statusFilter"
            :data-inicio="dataInicio"
            :data-fim="dataFim"
            :total-count="notasStore.totalNotas"
            :result-count="notasFiltradas.length"
            :loading="notasStore.loadingNotas"
            :export-loading="exportLoading"
            @update:search-term="searchTerm = $event"
            @update:status-filter="statusFilter = $event; aplicarFiltros()"
            @update:data-inicio="dataInicio = $event"
            @update:data-fim="dataFim = $event"
            @apply="aplicarFiltros"
            @refresh="carregarNotas"
            @export="exportarRelatorio"
          />
        </div>
      </div>

      <div
        class="relative"
        @touchstart.passive="handlePullStart"
        @touchmove="handlePullMove"
        @touchend="finishPullRefresh"
        @touchcancel="finishPullRefresh"
      >
        <div
          v-if="pullIndicatorVisible"
          class="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center"
        >
          <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <div
              class="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent"
              :class="pullRefreshing || pullReady ? 'animate-spin' : ''"
            />
            <span>{{ pullIndicatorText }}</span>
          </div>
        </div>

        <div
          class="space-y-6 transition-transform duration-200 ease-out"
          :class="{ 'duration-0': isPulling }"
          :style="pullContentStyle"
        >
          <NotasKpiGrid
            zinco-only
            :zinco-disponivel="stats.zincoDisponivel"
          />

          <div class="space-y-4">
        <div v-if="false" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="text-xs text-slate-500">
            <span>Página <span class="font-medium text-slate-900 dark:text-white">{{ notasStore.page }}</span> de {{ notasStore.totalPaginas }}</span>
            <span class="mx-2 hidden sm:inline">•</span>
            <span class="hidden sm:inline">Exibindo {{ intervaloNotas.inicio }}-{{ intervaloNotas.fim }} de {{ notasStore.totalNotas }}</span>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-500">Itens</label>
              <select
                :value="String(itensPorPagina)"
                class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                @change="mudarItensPorPagina(($event.target as HTMLSelectElement).value)"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                :disabled="notasStore.loadingNotas || notasStore.page <= 1"
                @click="irPaginaAnterior"
              >
                Anterior
              </button>
              <button
                type="button"
                class="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                :disabled="notasStore.loadingNotas || notasStore.page >= notasStore.totalPaginas"
                @click="irProximaPagina"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>

        <NotasTabela
          :notas="notasFiltradas"
          :loading="notasLoadingInicial"
          @open="abrirDetalheNota"
        />

        <InfiniteScrollTrigger
          v-if="notasFiltradas.length"
          :loading="notasLoadingMais"
          :done="!notasTemMais"
          :loaded-count="notasFiltradas.length"
          :total="notasStore.totalNotas"
          label="notas"
          done-label="Todas as notas foram carregadas."
          @load-more="carregarMaisNotas"
        />

          </div>
        </div>
      </div>

      <!-- Modal de Detalhes Modernizado -->
      <ModalGlobal
        v-model="modalAberto"
        title=""
        max-width-class="max-w-6xl"
        content-class="p-0"
        :show-footer="false"
        @update:model-value="(value) => { if (!value) fecharDetalheNota() }"
      >
        <template #header>
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Detalhes da nota
            </p>
            <h2 class="truncate text-base font-bold text-slate-950 dark:text-white md:text-lg">
              {{ notaDetalhe ? `Nota ${notaDetalhe.serie_nota || '1'}-${notaDetalhe.numero_nota || ''}` : 'Carregando nota' }}
            </h2>
          </div>
        </template>

        <template #header-actions>
          <div v-if="isAdmin && notaDetalhe && !loadingDetalhe" class="flex items-center gap-2">
            <button
              v-if="!detalheEditMode"
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Editar nota"
              title="Editar nota"
              @click="iniciarEdicaoDetalhe"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              v-if="!detalheEditMode"
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/70 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
              :disabled="deletingNota"
              aria-label="Excluir nota"
              title="Excluir nota"
              @click="abrirConfirmacaoExclusao"
            >
              <Trash2 class="h-4 w-4" />
            </button>

            <template v-else>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-600"
                :disabled="savingEdicao"
                :aria-label="savingEdicao ? 'Salvando nota' : 'Salvar alteracoes'"
                :title="savingEdicao ? 'Salvando...' : 'Salvar alteracoes'"
                @click="salvarEdicaoDetalhe"
              >
                <Save class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                :disabled="savingEdicao"
                aria-label="Cancelar edicao"
                title="Cancelar edicao"
                @click="cancelarEdicaoDetalhe"
              >
                <XCircle class="h-4 w-4" />
              </button>
            </template>
          </div>
        </template>

        <div v-if="loadingDetalhe" class="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20 text-center">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p class="text-xs text-slate-500">
            Carregando detalhes...
          </p>
        </div>

        <div v-else class="p-6 md:p-8">
          <NotaDetalheModal
            ref="detalheModalRef"
            :nota="notaDetalhe"
            :is-admin="isAdmin"
            :saving-edit="savingEdicao"
            @edit-mode-change="detalheEditMode = $event"
            @save-edit="salvarEdicaoNota"
          />
        </div>
      </ModalGlobal>

      <ModalGlobal
        v-model="confirmDeleteOpen"
        title=""
        max-width-class="max-w-lg"
        content-class="p-0"
        :show-footer="false"
        @update:model-value="(value) => { if (!value) cancelarExclusaoNota() }"
      >
        <template #header>
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-300">
              Acao perigosa
            </p>
            <h2 class="text-base font-bold text-slate-950 dark:text-white md:text-lg">
              Excluir nota?
            </h2>
          </div>
        </template>

        <div class="space-y-5 p-5 md:p-6">
          <div class="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-100">
            <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" />
            <div class="space-y-1 text-sm leading-relaxed">
              <p class="font-semibold">
                Esta exclusao vai remover a nota das listas principais.
              </p>
              <p class="text-rose-800/80 dark:text-rose-100/80">
                Essa acao exige permissao de administrador, fica registrada no historico e pode impactar conferencias e retiradas vinculadas.
              </p>
            </div>
          </div>

          <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <p class="font-semibold text-slate-950 dark:text-white">
              {{ notaDetalhe ? `Nota ${notaDetalhe.serie_nota || '1'}-${notaDetalhe.numero_nota || ''}` : 'Nota selecionada' }}
            </p>
            <p v-if="notaDetalhe?.nome_cliente" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ notaDetalhe.nome_cliente }}
            </p>
          </div>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              :disabled="deletingNota"
              @click="cancelarExclusaoNota"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="deletingNota"
              @click="confirmarExclusaoNota"
            >
              <Trash2 class="h-4 w-4" />
              {{ deletingNota ? 'Excluindo...' : 'Excluir nota' }}
            </button>
          </div>
        </div>
      </ModalGlobal>
    </div>
  </AppPageShell>
</template>
