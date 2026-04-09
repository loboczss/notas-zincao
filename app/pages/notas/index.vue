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

definePageMeta({
  middleware: 'auth',
})

const notasStore = useNotasStore()
const authStore = useAuthStore()
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
  }
  catch (err) {
    console.error('[salvarEdicaoNota]', err)
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
    description="Faça a gestão completa das notas fiscais e acompanhe o status das retiradas em tempo real."
  >
    <template #headerAside>
      <NuxtLink
        to="/cadastrar-nota"
        class="group relative flex shrink-0 items-center justify-center gap-2.5 overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-brand-500/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-brand-500/40 active:scale-95"
      >
        <div class="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        <Plus width="20" height="20" stroke-width="3" class="transition-transform duration-500 group-hover:rotate-90" />
        <span class="relative">Nova Nota</span>
      </NuxtLink>
    </template>

    <div class="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <!-- Bento Grid de Métricas: Organização Superior com Ícones -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
        <!-- Total de Notas -->
        <div class="glass-card group relative flex flex-col justify-center overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/40 p-6 transition-all duration-500 hover:scale-[1.02] hover:bg-white/60 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-500/5 blur-2xl transition-opacity group-hover:opacity-100" />
          <div class="flex items-center gap-2">
            <Package class="h-4 w-4 text-slate-400" />
            <span class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Total Geral</span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{{ stats.total }}</span>
          </div>
        </div>

        <!-- Pendentes -->
        <div class="glass-card group relative flex flex-col justify-center overflow-hidden rounded-[2.5rem] border border-brand-500/20 bg-brand-50/30 p-6 transition-all duration-500 hover:scale-[1.02] hover:bg-brand-50/50 dark:border-brand-500/10 dark:bg-brand-500/5 dark:hover:bg-brand-500/10">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-brand-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 animate-pulse rounded-full bg-brand-500 shadow-[0_0_8px_rgba(254,199,20,0.5)]" />
            <span class="text-[10px] font-black uppercase tracking-[0.15em] text-brand-600 dark:text-brand-400">Pendentes</span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-4xl font-black tracking-tight text-brand-700 dark:text-brand-300">{{ stats.pendentes }}</span>
          </div>
        </div>

        <!-- Parciais -->
        <div class="glass-card group relative flex flex-col justify-center overflow-hidden rounded-[2.5rem] border border-blue-500/20 bg-blue-50/30 p-6 transition-all duration-500 hover:scale-[1.02] hover:bg-blue-50/50 dark:border-blue-500/10 dark:bg-blue-500/5 dark:hover:bg-blue-500/10">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span class="text-[10px] font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">Parciais</span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-4xl font-black tracking-tight text-blue-700 dark:text-blue-300">{{ stats.parciais }}</span>
          </div>
        </div>

        <!-- Concluídas -->
        <div class="glass-card group relative flex flex-col justify-center overflow-hidden rounded-[2.5rem] border border-emerald-500/20 bg-emerald-50/30 p-6 transition-all duration-500 hover:scale-[1.02] hover:bg-emerald-50/50 dark:border-emerald-500/10 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10">
          <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-opacity group-hover:opacity-100" />
          <div class="flex items-center gap-2">
            <CheckCircle2 class="h-4 w-4 text-emerald-500" />
            <span class="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">Concluídas</span>
          </div>
          <div class="mt-3 flex items-baseline gap-2">
            <span class="text-4xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">{{ stats.concluidas }}</span>
          </div>
        </div>
      </div>

      <!-- Toolbar de Controle: Fora do Header para Descompressão Visual -->
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
        @update:status-filter="statusFilter = $event"
        @update:data-inicio="dataInicio = $event"
        @update:data-fim="dataFim = $event"
        @apply="aplicarFiltros"
        @refresh="carregarNotas"
        @export="exportarRelatorio"
      />

      <div class="space-y-8">
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
          <div class="flex flex-col">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Navegação</span>
            <p class="text-slate-700 dark:text-slate-200">
              Página <span class="font-black">{{ notasStore.page }}</span> de <span class="font-black">{{ notasStore.totalPaginas }}</span>
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Exibindo <span class="font-bold">{{ intervaloNotas.inicio }}-{{ intervaloNotas.fim }}</span> de <span class="font-bold">{{ notasStore.totalNotas }}</span> notas
            </p>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Itens por página</label>
            <select
              :value="String(itensPorPagina)"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]"
              @change="mudarItensPorPagina(($event.target as HTMLSelectElement).value)"
            >
              <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="10">10</option>
              <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="20">20</option>
              <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="30">30</option>
              <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="50">50</option>
              <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="100">100</option>
            </select>

            <button
              type="button"
              class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              :disabled="notasStore.loadingNotas || notasStore.page <= 1"
              @click="irPaginaAnterior"
            >
              Anterior
            </button>

            <button
              type="button"
              class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              :disabled="notasStore.loadingNotas || notasStore.page >= notasStore.totalPaginas"
              @click="irProximaPagina"
            >
              Próxima
            </button>
          </div>
        </div>

        <NotasTabela
          :notas="notasFiltradas"
          :loading="notasStore.loadingNotas"
          @open="abrirDetalheNota"
        />

        <div
          v-if="notasStore.errorMessage"
          class="rounded-[2.5rem] border-2 border-rose-500/20 bg-rose-500/10 p-6 text-center transition-all duration-300"
        >
          <p class="text-sm font-bold text-rose-600 dark:text-rose-400">
            {{ notasStore.errorMessage }}
          </p>
          <button
            class="mt-4 text-xs font-black uppercase tracking-widest text-rose-500 underline decoration-rose-500/30 underline-offset-4 hover:text-rose-400"
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
          <div class="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p class="text-sm font-bold uppercase tracking-widest text-slate-400 animate-pulse">
            Sincronizando dados...
          </p>
        </div>

        <div v-else class="p-6 md:p-10">
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
