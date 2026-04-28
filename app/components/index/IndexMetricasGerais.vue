<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { $fetch } from 'ofetch'
import {
  ReceiptText,
  CircleDashed,
  PackageCheck,
  RefreshCw,
  LayoutDashboard,
  Box,
  Truck,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'

import Botao from '../Botao.vue'
import ModalGlobal from '../ModalGlobal.vue'
import NotaDetalheModal from '../notas/NotaDetalheModal.vue'

type DashboardProduto10Response = {
  success: boolean
  produto: {
    id: number
    nome: string
    saldo_estoque: number
    notas_pendentes_com_produto: number
    quantidade_pendente_notas: number
    percentual_comprometido: number
    quantidade_filhos: number
  }
}

type DashboardNotasResumoResponse = {
  success: boolean
  resumo: {
    total_notas: number
    pendentes: number
    parciais: number
    retiradas: number
    canceladas: number
    pecas_compradas: number
    pecas_entregues: number
    pecas_pendentes: number
    percentual_entrega: number
  }
}

const loadingResumo = ref(false)
const errorMessage = ref('')
const resumoNotas = ref<DashboardNotasResumoResponse['resumo'] | null>(null)
const produtoId10 = ref<DashboardProduto10Response['produto'] | null>(null)
const loadingProdutoId10 = ref(false)

const metricas = computed(() => {
  const resumo = resumoNotas.value

  return {
    totalNotas: Number(resumo?.total_notas || 0),
    notasRetiradas: Number(resumo?.retiradas || 0),
    notasParciais: Number(resumo?.parciais || 0),
    notasPendentes: Number(resumo?.pendentes || 0),
    pecasCompradas: Number(resumo?.pecas_compradas || 0),
    pecasEntregues: Number(resumo?.pecas_entregues || 0),
    pecasPendentes: Number(resumo?.pecas_pendentes || 0),
    percentualEntrega: Number(resumo?.percentual_entrega || 0),
  }
})

const carregarResumoNotas = async () => {
  loadingResumo.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<DashboardNotasResumoResponse>('/api/dashboard/notas-resumo')
    resumoNotas.value = response?.resumo || null
  }
  catch (error) {
    console.error('[dashboard/notas-resumo]', error)
    resumoNotas.value = null
    errorMessage.value = error instanceof Error ? error.message : 'Falha ao carregar resumo de notas.'
  }
  finally {
    loadingResumo.value = false
  }
}

const metricasProdutoId10 = computed(() => {
  const produto = produtoId10.value

  return {
    id: produto?.id || 10,
    nome: String(produto?.nome || 'Produto ID 10'),
    saldoEstoque: Number(produto?.saldo_estoque || 0),
    notasPendentes: Number(produto?.notas_pendentes_com_produto || 0),
    quantidadePendenteNotas: Number(produto?.quantidade_pendente_notas || 0),
    percentualComprometido: Number(produto?.percentual_comprometido || 0),
    quantidadeFilhos: Number(produto?.quantidade_filhos || 0),
  }
})

const carregarProdutoId10 = async () => {
  loadingProdutoId10.value = true
  try {
    const response = await $fetch<DashboardProduto10Response>('/api/dashboard/produto-10')
    produtoId10.value = response.produto || null
  }
  catch (error) {
    console.error('[dashboard/produto-id-10]', error)
    produtoId10.value = null
  }
  finally {
    loadingProdutoId10.value = false
  }
}

const historicoRetiradas = ref<any[]>([])
const loadingHistorico = ref(false)
const modalAberto = ref(false)
const notaDetalhe = ref<any | null>(null)
const loadingDetalhe = ref(false)
const totalHistorico = ref(0)
const totalPages = ref(1)

const carregarHistoricoRetiradas = async () => {
  loadingHistorico.value = true
  try {
    const response = await $fetch<{
      success: boolean
      historico: any[]
      pagination?: {
        page: number
        page_size: number
        total: number
        total_pages: number
      }
    }>('/api/dashboard/retiradas-historico', {
      query: {
        page: currentPage.value,
        page_size: pageSize.value,
        sort_key: sortKey.value,
        sort_order: sortOrder.value,
      },
    })

    historicoRetiradas.value = response.historico || []
    totalHistorico.value = Number(response.pagination?.total || 0)
    totalPages.value = Number(response.pagination?.total_pages || 1)
    currentPage.value = Number(response.pagination?.page || 1)
  }
  catch (error) {
    console.error('[dashboard/retiradas-historico]', error)
    historicoRetiradas.value = []
    totalHistorico.value = 0
    totalPages.value = 1
  }
  finally {
    loadingHistorico.value = false
  }
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

const carregarMetricas = async () => {
  await Promise.all([
    carregarResumoNotas(),
    carregarProdutoId10(),
    carregarHistoricoRetiradas(),
  ])
}

const abrirDetalheNotaPorHistorico = async (evento: any) => {
  const notaId = String(evento?.id_nota || '').trim()
  if (!notaId) return

  modalAberto.value = true
  loadingDetalhe.value = true

  try {
    const response = await $fetch<{ success: boolean; nota: any }>(`/api/notas/${notaId}/detail`)
    notaDetalhe.value = response?.nota || null
  }
  catch (error) {
    console.error('[dashboard/nota-detalhe]', error)
    notaDetalhe.value = null
  }
  finally {
    loadingDetalhe.value = false
  }
}

const fecharDetalheNota = () => {
  modalAberto.value = false
}

// Ordenação
const sortKey = ref<string>('data')
const sortOrder = ref<'asc' | 'desc'>('desc')

const toggleSort = async (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortKey.value = key
    sortOrder.value = 'desc'
  }
  currentPage.value = 1
  await carregarHistoricoRetiradas()
}

// Paginação
const currentPage = ref(1)
const pageSize = ref(5)

const nextPage = async () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    await carregarHistoricoRetiradas()
  }
}

const prevPage = async () => {
  if (currentPage.value > 1) {
    currentPage.value--
    await carregarHistoricoRetiradas()
  }
}

const historicoInicio = computed(() => {
  if (!totalHistorico.value) return 0
  return (currentPage.value - 1) * pageSize.value + 1
})

const historicoFim = computed(() => {
  if (!totalHistorico.value) return 0
  return Math.min(currentPage.value * pageSize.value, totalHistorico.value)
})



onMounted(() => {
  carregarMetricas()
})
</script>

<template>
  <section class="animate-fade-in font-sans space-y-6">
    <!-- Erro -->
    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
      {{ errorMessage }}
    </div>

    <!-- Toolbar de Ação -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <LayoutDashboard class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Dashboard</h2>
          <p class="text-sm text-slate-500">Visão geral e indicadores</p>
        </div>
      </div>

      <button
        class="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        :disabled="loadingResumo"
        @click="carregarMetricas"
      >
        <RefreshCw class="h-4 w-4" :class="loadingResumo ? 'animate-spin' : ''" />
        <span>{{ loadingResumo ? 'Atualizando...' : 'Atualizar Dados' }}</span>
      </button>
    </div>

    <!-- Grid Principal: Status de Notas -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <ReceiptText class="h-4 w-4 text-slate-400" />
            <span class="text-sm font-medium text-slate-500">Total de Notas</span>
          </div>
        </div>
        <div class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ metricas.totalNotas }}</div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-2">
          <CircleDashed class="h-4 w-4 text-rose-500" />
          <span class="text-sm font-medium text-slate-500">Pendentes</span>
        </div>
        <div class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ metricas.notasPendentes }}</div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-2">
          <Truck class="h-4 w-4 text-brand-500" />
          <span class="text-sm font-medium text-slate-500">Parciais</span>
        </div>
        <div class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ metricas.notasParciais }}</div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-2">
          <PackageCheck class="h-4 w-4 text-emerald-500" />
          <span class="text-sm font-medium text-slate-500">Concluídas</span>
        </div>
        <div class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ metricas.notasRetiradas }}</div>
      </div>
    </div>

    <!-- Painel de Controle de Zinco -->
    <div class="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div class="p-6 md:p-8">
        <!-- Header do Painel -->
        <div class="flex flex-wrap items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Box class="h-6 w-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-slate-500">Controle de Estoque Prioritário</span>
                <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">ID {{ metricasProdutoId10.id }}</span>
              </div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ metricasProdutoId10.nome }}</h2>
            </div>
          </div>

          <!-- Status de Saúde do Estoque -->
          <div class="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/50">
            <div 
              class="h-2 w-2 rounded-full"
              :class="metricasProdutoId10.percentualComprometido > 90 ? 'bg-rose-500' : 'bg-emerald-500'"
            />
            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
              {{ metricasProdutoId10.percentualComprometido > 90 ? 'Estoque Crítico' : 'Fluxo Estável' }}
            </span>
          </div>
        </div>

        <div v-if="loadingProdutoId10" class="mt-8 flex items-center justify-center py-10">
          <div class="flex flex-col items-center gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p class="text-sm text-slate-500">Carregando dados...</p>
          </div>
        </div>

        <div v-else class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
          <!-- Coluna 1: Barra de Progresso e Métricas de Volume -->
          <div class="space-y-8">
            <div class="relative">
              <div class="mb-2 flex items-end justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Ocupação Logística por Zinco</h3>
                  <p class="text-sm text-slate-500">Volume vendido aguardando carregamento</p>
                </div>
                <div class="text-right">
                  <span class="text-2xl font-bold text-brand-600">{{ metricasProdutoId10.percentualComprometido }}%</span>
                  <span class="ml-1 text-xs font-medium text-slate-500">Comprometido</span>
                </div>
              </div>

              <!-- Container da Barra -->
              <div class="relative h-6 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                <div
                  class="relative h-full bg-brand-500 transition-all duration-500"
                  :class="metricasProdutoId10.percentualComprometido > 90 ? 'bg-rose-500' : 'bg-brand-500'"
                  :style="{ width: `${metricasProdutoId10.percentualComprometido}%` }"
                />
              </div>
            </div>

            <!-- Dashboard Interno de Volumes -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <span class="block text-xs font-medium text-slate-500">Saldo Total em Pátio</span>
                <span class="mt-1 block text-xl font-bold text-slate-900 dark:text-white">{{ metricasProdutoId10.saldoEstoque }} <span class="text-xs font-normal text-slate-400">m²</span></span>
              </div>
              <div class="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-900/10">
                <span class="block text-xs font-medium text-brand-600 dark:text-brand-400">Pendente a Entregar</span>
                <span class="mt-1 block text-xl font-bold text-brand-700 dark:text-brand-300">{{ metricasProdutoId10.quantidadePendenteNotas }} <span class="text-xs font-normal opacity-70">m²</span></span>
              </div>
              <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
                <span class="block text-xs font-medium text-emerald-600 dark:text-emerald-400">Saldo Livre Real</span>
                <span class="mt-1 block text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {{ Math.max(0, metricasProdutoId10.saldoEstoque - metricasProdutoId10.quantidadePendenteNotas).toFixed(2) }}
                  <span class="text-xs font-normal opacity-70">m²</span>
                </span>
                <p class="mt-1 text-xs text-emerald-600/70">Disponível para venda</p>
              </div>
            </div>
          </div>

          <!-- Coluna 2: Métricas Secundárias e Cards de Operação -->
          <div class="flex flex-col gap-4 lg:border-l lg:border-slate-200 lg:pl-8 lg:dark:border-slate-800">
            <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div class="flex items-center gap-3">
                <ReceiptText class="h-5 w-5 text-slate-400" />
                <div>
                  <p class="text-xs font-medium text-slate-500">Notas em Aberto</p>
                  <p class="text-lg font-bold text-slate-900 dark:text-white">{{ metricasProdutoId10.notasPendentes }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div class="flex items-center gap-3">
                <Box class="h-5 w-5 text-slate-400" />
                <div>
                  <p class="text-xs font-medium text-slate-500">Filhos Vinculados</p>
                  <p class="text-lg font-bold text-slate-900 dark:text-white">{{ metricasProdutoId10.quantidadeFilhos }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-900/10">
              <div class="flex items-start gap-3">
                <AlertCircle class="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <div>
                  <h4 class="text-xs font-semibold text-brand-900 dark:text-brand-300">Atenção</h4>
                  <p class="mt-1 text-xs leading-relaxed text-brand-800 dark:text-brand-400">
                    O volume comprometido representa {{ metricasProdutoId10.percentualComprometido }}% do pátio atual.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Seção de Peças e Volume Físico -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <!-- Painel de Progresso Físico: Eficiência de Carregamento -->
      <article class="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div class="flex items-center gap-2">
            <Truck class="h-5 w-5 text-slate-400" />
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Eficiência de Entrega Física</h3>
          </div>
          <p class="mt-1 text-sm text-slate-500">Relação entre peças faturadas e carregadas.</p>
        </div>

        <div class="mt-6 space-y-4">
          <div class="flex items-end justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-medium text-slate-500">Status de Entrega</span>
              <div class="text-3xl font-bold text-brand-600">{{ metricas.percentualEntrega }}%</div>
            </div>
            <div class="text-right">
              <span class="block text-xs font-medium text-slate-500">Restante</span>
              <span class="text-xl font-bold text-slate-900 dark:text-white">{{ metricas.pecasPendentes }} <span class="text-xs font-normal text-slate-400">UN</span></span>
            </div>
          </div>

          <div class="relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div 
              class="h-full bg-brand-500 transition-all duration-500" 
              :style="{ width: `${metricas.percentualEntrega}%` }"
            />
          </div>

          <div class="grid grid-cols-2 gap-4 pt-2">
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <span class="block text-xs font-medium text-slate-500">Volume Total</span>
              <span class="mt-1 block text-lg font-bold text-slate-900 dark:text-white">{{ metricas.pecasCompradas }} <span class="text-xs font-normal text-slate-400">PCS</span></span>
            </div>
            <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10">
              <span class="block text-xs font-medium text-emerald-600 dark:text-emerald-400">Já Entregue</span>
              <span class="mt-1 block text-lg font-bold text-emerald-700 dark:text-emerald-300">{{ metricas.pecasEntregues }} <span class="text-xs font-normal opacity-70">PCS</span></span>
            </div>
          </div>
        </div>
      </article>

      <!-- Painel de Destaques Operacionais -->
      <article class="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Leitura Operacional</h3>
          <p class="mt-1 text-sm text-slate-500">Destaques da volumetria física atual.</p>
        </div>

        <div class="space-y-3 mt-2">
          <div class="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <Box class="h-5 w-5 shrink-0 text-brand-500" />
            <div>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">Capacidade de Pátio</p>
              <p class="text-sm text-slate-500">Existem {{ metricas.pecasPendentes }} peças aguardando retirada.</p>
            </div>
          </div>

          <div class="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/10">
            <PackageCheck class="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Fluxo de Conclusão</p>
              <p class="text-sm text-emerald-700 dark:text-emerald-400">{{ metricas.notasRetiradas }} notas finalizadas pela logística.</p>
            </div>
          </div>

          <div class="flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 p-4 dark:border-brand-900/30 dark:bg-brand-900/10">
            <AlertCircle class="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
            <div>
              <p class="text-sm font-semibold text-brand-900 dark:text-brand-300">Atenção Necessária</p>
              <p class="text-sm text-brand-700 dark:text-brand-400">{{ metricas.notasParciais }} notas com entregas parciais pendentes.</p>
            </div>
          </div>
        </div>
      </article>
    </div>
    <!-- Histórico de Retiradas -->
    <div class="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div class="p-6 border-b border-slate-100 dark:border-slate-800">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Histórico de Retiradas Recentes</h3>
        <p class="text-sm text-slate-500">Últimas entregas efetuadas e impacto no Zinco (Cód. #10)</p>
      </div>

      <div class="overflow-x-auto">
        <div v-if="loadingHistorico" class="flex items-center justify-center py-8 text-sm text-slate-500">
          Carregando histórico...
        </div>
        <div v-else-if="!totalHistorico" class="flex items-center justify-center py-8 text-sm text-slate-400 italic">
          Nenhuma retirada registrada até o momento.
        </div>
        <table v-else class="w-full min-w-[600px] text-left text-xs">
          <thead class="bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th class="px-6 py-3.5 cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors" @click="toggleSort('data')">
                <div class="flex items-center gap-1.5">
                  <span>Data / Operador</span>
                  <ArrowUp v-if="sortKey === 'data' && sortOrder === 'asc'" class="h-3.5 w-3.5 text-brand-600" />
                  <ArrowDown v-else-if="sortKey === 'data' && sortOrder === 'desc'" class="h-3.5 w-3.5 text-brand-600" />
                  <ArrowUpDown v-else class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                </div>
              </th>
              <th class="px-6 py-3.5 cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors" @click="toggleSort('nome_cliente')">
                <div class="flex items-center gap-1.5">
                  <span>Cliente / Nota</span>
                  <ArrowUp v-if="sortKey === 'nome_cliente' && sortOrder === 'asc'" class="h-3.5 w-3.5 text-brand-600" />
                  <ArrowDown v-else-if="sortKey === 'nome_cliente' && sortOrder === 'desc'" class="h-3.5 w-3.5 text-brand-600" />
                  <ArrowUpDown v-else class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                </div>
              </th>
              <th class="px-6 py-3.5 cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors" @click="toggleSort('itens')">
                <div class="flex items-center gap-1.5">
                  <span>Itens Retirados</span>
                  <ArrowUp v-if="sortKey === 'itens' && sortOrder === 'asc'" class="h-3.5 w-3.5 text-brand-600" />
                  <ArrowDown v-else-if="sortKey === 'itens' && sortOrder === 'desc'" class="h-3.5 w-3.5 text-brand-600" />
                  <ArrowUpDown v-else class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                </div>
              </th>
              <th class="px-6 py-3.5 cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors" @click="toggleSort('reducao_zinco_10')">
                <div class="flex items-center justify-end gap-1.5">
                  <span>Baixa Zinco (m²)</span>
                  <ArrowUp v-if="sortKey === 'reducao_zinco_10' && sortOrder === 'asc'" class="h-3.5 w-3.5 text-brand-600" />
                  <ArrowDown v-else-if="sortKey === 'reducao_zinco_10' && sortOrder === 'desc'" class="h-3.5 w-3.5 text-brand-600" />
                  <ArrowUpDown v-else class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr 
              v-for="(event, eIdx) in historicoRetiradas" 
              :key="eIdx"
              class="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors"
              @click="abrirDetalheNotaPorHistorico(event)"
            >
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900 dark:text-slate-100">{{ formatDateTime(event.data) }}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">{{ event.responsavel_nome }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900 dark:text-slate-200">{{ event.nome_cliente }}</div>
                <div class="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">Nota: {{ event.serie_nota }}-{{ event.numero_nota }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                  <span 
                    v-for="(it, iIdx) in event.itens" 
                    :key="iIdx"
                    class="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {{ it.nome }} ({{ it.quantidade }})
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-right font-bold" :class="event.reducao_zinco_10 > 0 ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'">
                {{ event.reducao_zinco_10 > 0 ? `-${event.reducao_zinco_10}` : '0' }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Paginação -->
        <div v-if="totalHistorico > 0" class="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <div class="text-xs text-slate-500">
            Mostrando <span class="font-medium text-slate-700 dark:text-slate-300">{{ historicoInicio }}</span> até 
            <span class="font-medium text-slate-700 dark:text-slate-300">{{ historicoFim }}</span> de 
            <span class="font-medium text-slate-700 dark:text-slate-300">{{ totalHistorico }}</span> registros.
          </div>
          
          <div class="flex items-center gap-2">
            <button 
              @click="prevPage" 
              :disabled="currentPage === 1"
              class="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>
            
            <span class="text-xs text-slate-600 dark:text-slate-400">
              Página <span class="font-semibold text-slate-900 dark:text-white">{{ currentPage }}</span> de {{ totalPages }}
            </span>
            
            <button 
              @click="nextPage" 
              :disabled="currentPage === totalPages"
              class="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </div>

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
          :is-admin="false"
        />
      </div>
    </ModalGlobal>
  </section>

</template>
