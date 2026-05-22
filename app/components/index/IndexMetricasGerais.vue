<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  PackageCheck,
  RefreshCw,
  LayoutDashboard,
  Box,
  Truck,
  AlertCircle,
} from 'lucide-vue-next'

import NotasKpiGrid from '../notas/NotasKpiGrid.vue'
import { useToast } from '../../composables/useToast'
import { getApiErrorMessage } from '../../utils/api-errors'
import { getApiFetch } from '../../utils/api-fetch'

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
const apiFetch = getApiFetch()
const { error: showError } = useToast()

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
    const response = await apiFetch<DashboardNotasResumoResponse>('/api/dashboard/notas-resumo')
    resumoNotas.value = response?.resumo || null
  }
  catch (error) {
    console.error('[dashboard/notas-resumo]', error)
    resumoNotas.value = null
    errorMessage.value = getApiErrorMessage(error, 'Falha ao carregar resumo de notas.')
    showError(errorMessage.value)
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
    quantidadePendenteNotas: Number(produto?.quantidade_pendente_notas || 0),
    percentualComprometido: Number(produto?.percentual_comprometido || 0),
    quantidadeFilhos: Number(produto?.quantidade_filhos || 0),
  }
})

const formatMedidaM2 = (value: number) => {
  const numericValue = Number(value || 0)
  const hasFraction = Math.abs(numericValue - Math.trunc(numericValue)) > 0.000001

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: hasFraction ? 1 : 0,
  }).format(numericValue)
}

const carregarProdutoId10 = async () => {
  loadingProdutoId10.value = true
  try {
    const response = await apiFetch<DashboardProduto10Response>('/api/dashboard/produto-10')
    produtoId10.value = response.produto || null
  }
  catch (error) {
    console.error('[dashboard/produto-id-10]', error)
    showError(getApiErrorMessage(error, 'Falha ao carregar dados de estoque.'))
    produtoId10.value = null
  }
  finally {
    loadingProdutoId10.value = false
  }
}

const carregarMetricas = async () => {
  await Promise.all([
    carregarResumoNotas(),
    carregarProdutoId10(),
  ])
}



onMounted(() => {
  carregarMetricas()
})
</script>

<template>
  <section class="animate-fade-in font-sans space-y-6">
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

    <NotasKpiGrid
      :total="metricas.totalNotas"
      :pendentes="metricas.notasPendentes"
      :parciais="metricas.notasParciais"
      :concluidas="metricas.notasRetiradas"
      :zinco-disponivel="metricasProdutoId10.saldoEstoque"
    />

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

        <div v-else class="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px] lg:gap-8">
          <!-- Coluna 1: Barra de Progresso e Métricas de Volume -->
          <div class="space-y-6">
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
            <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
              <article class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center gap-2">
                  <Box class="h-4 w-4 shrink-0 text-slate-400" />
                  <span class="min-w-0 truncate text-xs font-medium text-slate-500">Saldo Total</span>
                </div>
                <div class="mt-2 flex items-baseline gap-1">
                  <span class="truncate text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{{ formatMedidaM2(metricasProdutoId10.saldoEstoque) }}</span>
                  <span class="text-xs font-medium text-slate-400">m²</span>
                </div>
                <p class="mt-1 truncate text-[11px] text-slate-400">Em pátio</p>
              </article>

              <article class="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-900/10">
                <div class="flex items-center gap-2">
                  <Truck class="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                  <span class="min-w-0 truncate text-xs font-medium text-brand-600 dark:text-brand-400">Pendente</span>
                </div>
                <div class="mt-2 flex items-baseline gap-1">
                  <span class="truncate text-xl font-bold text-brand-700 dark:text-brand-300 sm:text-2xl">{{ formatMedidaM2(metricasProdutoId10.quantidadePendenteNotas) }}</span>
                  <span class="text-xs font-medium text-brand-600/70 dark:text-brand-300/70">m²</span>
                </div>
                <p class="mt-1 truncate text-[11px] text-brand-700/70 dark:text-brand-300/70">A entregar</p>
              </article>

              <article class="col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/10 md:col-span-1">
                <div class="flex items-center gap-2">
                  <PackageCheck class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span class="min-w-0 truncate text-xs font-medium text-emerald-600 dark:text-emerald-400">Saldo Livre</span>
                </div>
                <div class="mt-2 flex items-baseline gap-1">
                  <span class="truncate text-xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-2xl">
                    {{ formatMedidaM2(Math.max(0, metricasProdutoId10.saldoEstoque - metricasProdutoId10.quantidadePendenteNotas)) }}
                  </span>
                  <span class="text-xs font-medium text-emerald-600/70 dark:text-emerald-300/70">m²</span>
                </div>
                <p class="mt-1 truncate text-[11px] text-emerald-700/70 dark:text-emerald-300/70">Disponível para venda</p>
              </article>
            </div>
          </div>

          <!-- Coluna 2: Métricas Secundárias e Cards de Operação -->
          <div class="lg:border-l lg:border-slate-200 lg:pl-8 lg:dark:border-slate-800">
            <article class="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-900/10">
              <div class="flex items-start gap-3">
                <AlertCircle class="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <div>
                  <h4 class="text-xs font-semibold text-brand-900 dark:text-brand-300">Atenção</h4>
                  <p class="mt-1 text-xs leading-relaxed text-brand-800 dark:text-brand-400">
                    O volume comprometido representa {{ metricasProdutoId10.percentualComprometido }}% do pátio atual.
                  </p>
                </div>
              </div>
            </article>
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
  </section>

</template>
