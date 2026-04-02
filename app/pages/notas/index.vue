<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { $fetch } from 'ofetch'
import type { NotaRetiradaStatus } from '../../../shared/types/NotasRetirada'
import { CheckCircle2, Package, LayoutDashboard, Wallet, Plus } from 'lucide-vue-next'
import AppPageShell from '../../components/layout/AppPageShell.vue'
import ModalGlobal from '../../components/ModalGlobal.vue'
import NotaDetalheModal from '../../components/notas/NotaDetalheModal.vue'
import NotasTabela from '../../components/notas/NotasTabela.vue'
import NotasToolbar from '../../components/notas/NotasToolbar.vue'
import { useNotasStore } from '../../stores'

definePageMeta({
  middleware: 'auth',
})

const notasStore = useNotasStore()
const searchTerm = ref('')
const statusFilter = ref<'todos' | NotaRetiradaStatus>('todos')
const dataInicio = ref('')
const dataFim = ref('')
const modalAberto = ref(false)
const notaDetalhe = ref<any | null>(null)
const loadingDetalhe = ref(false)

const carregarNotas = async () => {
  await notasStore.fetchNotas({
    search: searchTerm.value,
    status: statusFilter.value,
    data_inicio: dataInicio.value,
    data_fim: dataFim.value,
  })
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

onMounted(async () => {
  await carregarNotas()
})

const aplicarFiltros = async () => {
  await carregarNotas()
}

const notasFiltradas = computed(() => notasStore.notas)

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
      <div class="xl:max-w-6xl mx-auto w-full">
        <NotasToolbar
          :search-term="searchTerm"
          :status-filter="statusFilter"
          :data-inicio="dataInicio"
          :data-fim="dataFim"
          :total-count="notasStore.notas.length"
          :result-count="notasFiltradas.length"
          :loading="notasStore.loadingNotas"
          @update:search-term="searchTerm = $event"
          @update:status-filter="statusFilter = $event"
          @update:data-inicio="dataInicio = $event"
          @update:data-fim="dataFim = $event"
          @apply="aplicarFiltros"
          @refresh="carregarNotas"
        />
      </div>

      <div class="space-y-8">
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
        title="Dossiê da Nota"
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
          />
        </div>
      </ModalGlobal>
    </div>
  </AppPageShell>
</template>
