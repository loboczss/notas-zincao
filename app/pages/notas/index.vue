<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { $fetch } from 'ofetch'
import type { NotaAdminEditRequest, NotaRetiradaStatus } from '../../../shared/types/NotasRetirada'
import { CheckCircle2, Package, LayoutDashboard, Wallet, Plus } from 'lucide-vue-next'
import AppPageShell from '../../components/layout/AppPageShell.vue'
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
const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const carregarNotas = async () => {
  await notasStore.fetchNotas({
    search: searchTerm.value,
    status: statusFilter.value,
    data_inicio: dataInicio.value,
    data_fim: dataFim.value,
    page: paginaAtual.value,
    page_size: itensPorPagina.value,
  })

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
  return {
    total: todas.length,
    pendentes: todas.filter(n => n.status_retirada === 'pendente').length,
    parciais: todas.filter(n => n.status_retirada === 'parcial').length,
    concluidas: todas.filter(n => n.status_retirada === 'retirada').length,
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
        class="group relative flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-[2rem] bg-amber-600 px-8 py-4 text-sm font-black text-white transition-all hover:bg-amber-500 active:scale-95"
      >
        <Plus width="18" height="18" stroke-width="3" />
        Nova Nota
      </NuxtLink>
    </template>

    <div class="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <!-- Bento Grid de Métricas: Organização Superior com Ícones -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
        <div class="glass-card group flex flex-col justify-center rounded-[2.5rem] border p-6 transition-all hover:bg-white/[0.05] dark:border-white/5 dark:bg-white/[0.02]">
          <div class="flex items-center gap-2">
            <Package class="h-3 w-3 text-brand-500 opacity-60" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total de Notas</span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black text-slate-900 dark:text-white">{{ stats.total }}</span>
          </div>
        </div>

        <div class="glass-card group flex flex-col justify-center rounded-[2.5rem] border p-6 transition-all hover:bg-white/[0.05] dark:border-white/5 dark:bg-white/[0.02]">
          <div class="flex items-center gap-2">
            <div class="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-rose-500">Pendentes</span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black text-rose-600 dark:text-rose-400">{{ stats.pendentes }}</span>
          </div>
        </div>

        <div class="glass-card group flex flex-col justify-center rounded-[2.5rem] border p-6 transition-all hover:bg-white/[0.05] dark:border-white/5 dark:bg-white/[0.02]">
          <div class="flex items-center gap-2">
            <div class="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Parciais</span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black text-amber-600 dark:text-amber-400">{{ stats.parciais }}</span>
          </div>
        </div>

        <div class="glass-card group flex flex-col justify-center rounded-[2.5rem] border p-6 transition-all hover:bg-white/[0.05] dark:border-white/5 dark:bg-white/[0.02]">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="h-3 w-3 text-emerald-500 opacity-60" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Concluídas</span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black text-emerald-600 dark:text-emerald-400">{{ stats.concluidas }}</span>
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
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-amber-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]"
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
