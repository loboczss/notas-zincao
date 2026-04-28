<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { $fetch } from 'ofetch'
import type { NotaAdminEditRequest, NotaRetiradaStatus } from '../../../shared/types/NotasRetirada'
import { CheckCircle2, Package, LayoutDashboard, Wallet, Plus } from 'lucide-vue-next'
import AppPageShell from '../../components/layout/AppPageShell.vue'
import Botao from '../../components/Botao.vue'
import ModalGlobal from '../../components/ModalGlobal.vue'
import NotaDetalheModal from '../../components/notas/NotaDetalheModal.vue'
import NotasTabela from '../../components/notas/NotasTabela.vue'
import NotasToolbar from '../../components/notas/NotasToolbar.vue'
import { useAuthStore, useNotasStore } from '../../stores'
import { useToast } from '../../composables/useToast'


definePageMeta({
  middleware: 'auth',
})

const notasStore = useNotasStore()
const authStore = useAuthStore()
const { success: showSuccess, error: showError } = useToast()

const searchTerm = ref('')
const statusFilter = ref<'todos' | NotaRetiradaStatus>('todos')
const dataInicio = ref('')
const dataFim = ref('')
const paginaAtual = ref(1)
const itensPorPagina = ref(20)
const modalAberto = ref(false)
const notaDetalhe = ref<any | null>(null)
const loadingDetalhe = ref(false)
const savingEdicao = ref(false)
const exportLoading = ref<'csv' | 'pdf' | false>(false)
const resumoNotas = ref<{
  total_notas: number
  pendentes: number
  parciais: number
  retiradas: number
} | null>(null)
const router = useRouter()
const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const carregarResumoNotas = async () => {
  try {
    const response = await $fetch<{
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
  }
}

const carregarNotas = async () => {
  await Promise.all([
    notasStore.fetchNotas({
      search: searchTerm.value,
      status: statusFilter.value,
      data_inicio: dataInicio.value,
      data_fim: dataFim.value,
      page: paginaAtual.value,
      page_size: itensPorPagina.value,
    }),
    carregarResumoNotas(),
  ])

  paginaAtual.value = notasStore.page
}

const carregarDetalhe = async (id: string) => {
  loadingDetalhe.value = true
  try {
    const response = await $fetch<{ success: boolean; nota: any }>(`/api/notas/${id}/detail`)
    notaDetalhe.value = response.nota
  }
  finally {
    loadingDetalhe.value = false
  }
}

const abrirDetalheNota = async (id: string) => {
  modalAberto.value = true
  await carregarDetalhe(id)
}

const fecharDetalheNota = () => {
  modalAberto.value = false
}

const salvarEdicaoNota = async (payload: NotaAdminEditRequest) => {
  if (!notaDetalhe.value?.id || !isAdmin.value || savingEdicao.value) return

  savingEdicao.value = true
  try {
    await $fetch(`/api/notas/${notaDetalhe.value.id}/edit`, {
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


const exportarRelatorio = async (format: 'csv' | 'pdf') => {
  if (exportLoading.value) return
  exportLoading.value = format
  try {
    const params = new URLSearchParams({ format })
    if (searchTerm.value) params.set('search', searchTerm.value)
    if (statusFilter.value !== 'todos') params.set('status', statusFilter.value)
    if (dataInicio.value) params.set('data_inicio', dataInicio.value)
    if (dataFim.value) params.set('data_fim', dataFim.value)

    const res = await fetch(`/api/notas/export?${params.toString()}`)
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
  }
  finally {
    exportLoading.value = false
  }
}

onMounted(async () => {
  await carregarNotas()
})

const aplicarFiltros = async () => {
  paginaAtual.value = 1
  await carregarNotas()
}

const irPaginaAnterior = async () => {
  if (paginaAtual.value <= 1 || notasStore.loadingNotas) return
  paginaAtual.value -= 1
  await carregarNotas()
}

const irProximaPagina = async () => {
  if (paginaAtual.value >= notasStore.totalPaginas || notasStore.loadingNotas) return
  paginaAtual.value += 1
  await carregarNotas()
}

const mudarItensPorPagina = async (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return
  itensPorPagina.value = Math.min(100, Math.trunc(parsed))
  paginaAtual.value = 1
  await carregarNotas()
}

const notasFiltradas = computed(() => notasStore.notas)

const intervaloNotas = computed(() => {
  const total = notasStore.totalNotas
  if (!total) {
    return { inicio: 0, fim: 0 }
  }

  const inicio = (notasStore.page - 1) * notasStore.pageSize + 1
  const fim = Math.min(notasStore.page * notasStore.pageSize, total)
  return { inicio, fim }
})

// Métricas Reativas
const stats = computed(() => {
  const todas = notasStore.notas
  const resumo = resumoNotas.value

  return {
    total: Number(resumo?.total_notas ?? notasStore.totalNotas),
    pendentes: Number(resumo?.pendentes ?? todas.filter(n => n.status_retirada === 'pendente').length),
    parciais: Number(resumo?.parciais ?? todas.filter(n => n.status_retirada === 'parcial').length),
    concluidas: Number(resumo?.retiradas ?? todas.filter(n => n.status_retirada === 'retirada').length),
    valorTotal: todas.reduce((acc, n) => acc + (n.valor_total || 0), 0)
  }
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
</script>

<template>
  <AppPageShell
    eyebrow="Operações"
    title="Notas de Retirada"
    description="Gestão de notas fiscais e acompanhamento de retiradas."
  >
    <template #headerAside>
      <NuxtLink
        to="/cadastrar-nota"
        class="flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-brand-500 active:bg-brand-700"
      >
        <Plus class="h-4 w-4" />
        <span>Nova Nota</span>
      </NuxtLink>
    </template>

    <div class="animate-fade-in font-sans space-y-6">
      <!-- Minimalist Metrics Grid -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <!-- Total de Notas -->
        <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center gap-2">
            <Package class="h-4 w-4 text-slate-400" />
            <span class="text-xs font-medium text-slate-500">Total Geral</span>
          </div>
          <div class="mt-2 flex items-baseline">
            <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.total }}</span>
          </div>
        </div>

        <!-- Pendentes -->
        <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-brand-500" />
            <span class="text-xs font-medium text-slate-500">Pendentes</span>
          </div>
          <div class="mt-2 flex items-baseline">
            <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.pendentes }}</span>
          </div>
        </div>

        <!-- Parciais -->
        <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-blue-500" />
            <span class="text-xs font-medium text-slate-500">Parciais</span>
          </div>
          <div class="mt-2 flex items-baseline">
            <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.parciais }}</span>
          </div>
        </div>

        <!-- Concluídas -->
        <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="h-4 w-4 text-emerald-500" />
            <span class="text-xs font-medium text-slate-500">Concluídas</span>
          </div>
          <div class="mt-2 flex items-baseline">
            <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.concluidas }}</span>
          </div>
        </div>
      </div>

      <!-- Toolbar de Controle -->
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

      <div class="space-y-4">
        <!-- Pagination Minimal -->
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
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
          :loading="notasStore.loadingNotas"
          @open="abrirDetalheNota"
        />

        <div
          v-if="notasStore.errorMessage"
          class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center dark:border-rose-900/50 dark:bg-rose-950/20"
        >
          <p class="text-sm text-rose-600 dark:text-rose-400">
            {{ notasStore.errorMessage }}
          </p>
          <button
            class="mt-2 text-xs font-medium text-rose-600 underline hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            @click="carregarNotas"
          >
            Tentar novamente
          </button>
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
        <div v-if="loadingDetalhe" class="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20 text-center">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p class="text-xs text-slate-500">
            Carregando detalhes...
          </p>
        </div>

        <div v-else class="p-6 md:p-8">
          <NotaDetalheModal
            :nota="notaDetalhe"
            :is-admin="isAdmin"
            :saving-edit="savingEdicao"
            @save-edit="salvarEdicaoNota"
          />
        </div>
      </ModalGlobal>
    </div>
  </AppPageShell>
</template>
