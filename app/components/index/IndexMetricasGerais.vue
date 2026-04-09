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
  AlertCircle
} from 'lucide-vue-next'
import Botao from '../Botao.vue'

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
  <section class="space-y-8">
    <!-- Erro -->
    <p v-if="errorMessage" class="rounded-2xl border border-red-500/10 bg-red-500/5 px-6 py-4 text-sm font-bold text-red-500">
      {{ errorMessage }}
    </p>

    <!-- Toolbar de Ação -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
          <LayoutDashboard class="h-5 w-5" />
        </div>
        <div>
          <h2 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Indicadores de Status</h2>
          <p class="text-[10px] font-bold text-slate-400">Atualizado em tempo real</p>
        </div>
      </div>

      <Botao variant="secondary" :disabled="loadingResumo" class="rounded-2xl" @click="carregarMetricas">
        <RefreshCw class="h-4 w-4" :class="loadingResumo ? 'animate-spin' : ''" />
        <span class="ml-2">{{ loadingResumo ? 'Atualizando...' : 'Atualizar Dados' }}</span>
      </Botao>
    </div>

    <!-- Grid Principal: Status de Notas -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="glass-card flex flex-col gap-4 rounded-[2.5rem] border p-6 dark:border-white/5 dark:bg-white/[0.02]">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/5">
          <ReceiptText class="h-6 w-6" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total de Notas</span>
          <div class="mt-1 text-3xl font-black text-slate-900 dark:text-white">{{ metricas.totalNotas }}</div>
        </div>
      </div>

      <div class="glass-card flex flex-col gap-4 rounded-[2.5rem] border p-6 dark:border-white/5 dark:bg-white/[0.02]">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <CircleDashed class="h-6 w-6" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pendentes</span>
          <div class="mt-1 text-3xl font-black text-rose-600 dark:text-rose-400">{{ metricas.notasPendentes }}</div>
        </div>
      </div>

      <div class="glass-card flex flex-col gap-4 rounded-[2.5rem] border p-6 dark:border-white/5 dark:bg-white/[0.02]">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
          <Truck class="h-6 w-6" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Parciais</span>
          <div class="mt-1 text-3xl font-black text-brand-600 dark:text-brand-400">{{ metricas.notasParciais }}</div>
        </div>
      </div>

      <div class="glass-card flex flex-col gap-4 rounded-[2.5rem] border p-6 dark:border-white/5 dark:bg-white/[0.02]">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <PackageCheck class="h-6 w-6" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Concluídas</span>
          <div class="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400">{{ metricas.notasRetiradas }}</div>
        </div>
      </div>

    </div>

    <!-- Painel de Controle de Zinco: Foco Industrial e Precisão Operacional -->
    <div class="glass-card group relative overflow-hidden rounded-[3rem] border border-white/40 bg-white/40 shadow-2xl transition-all duration-500 hover:shadow-brand-500/10 dark:border-white/5 dark:bg-white/[0.02]">
      <!-- Efeito Glow de Fundo -->
      <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/5 blur-[100px] transition-opacity duration-700 group-hover:opacity-100" />
      
      <div class="relative p-8 md:p-10">
        <!-- Header do Painel -->
        <div class="flex flex-wrap items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <div class="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20">
              <Box class="h-8 w-8" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Controle de Estoque Prioritário</span>
                <span class="flex h-5 items-center rounded-full bg-brand-500/10 px-2.5 text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">ID {{ metricasProdutoId10.id }}</span>
              </div>
              <h2 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{{ metricasProdutoId10.nome }}</h2>
            </div>
          </div>

          <!-- Status de Saúde do Estoque -->
          <div class="flex items-center gap-3 rounded-2xl bg-slate-100/50 px-5 py-3 dark:bg-white/[0.03]">
            <div 
              class="h-2.5 w-2.5 animate-pulse rounded-full"
              :class="metricasProdutoId10.percentualComprometido > 90 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'"
            />
            <span class="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {{ metricasProdutoId10.percentualComprometido > 90 ? 'Estoque Crítico' : 'Fluxo Operacional Estável' }}
            </span>
          </div>
        </div>

        <div v-if="loadingProdutoId10" class="mt-12 flex items-center justify-center py-10">
          <div class="flex flex-col items-center gap-4">
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p class="text-xs font-bold uppercase tracking-widest text-slate-400">Sincronizando pátio...</p>
          </div>
        </div>

        <div v-else class="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          <!-- Coluna 1: Barra de Progresso e Métricas de Volume -->
          <div class="space-y-10">
            <!-- Barra de Progresso Segmentada e Industrial -->
            <div class="relative">
              <div class="mb-4 flex items-end justify-between">
                <div>
                  <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Ocupação Logística por Zinco</h3>
                  <p class="text-xs font-bold text-slate-400">Volume vendido aguardando carregamento</p>
                </div>
                <div class="text-right">
                  <span class="text-4xl font-black tracking-tighter text-brand-500">{{ metricasProdutoId10.percentualComprometido }}%</span>
                  <span class="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Comprometido</span>
                </div>
              </div>

              <!-- Container da Barra -->
              <div class="relative h-10 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 p-1.5 dark:border-white/5 dark:bg-white/[0.03]">
                <!-- Gradiente de Fundo Metálico -->
                <div class="absolute inset-0 bg-gradient-to-r from-slate-200/50 to-transparent dark:from-white/[0.02]" />
                
                <!-- Fill da Barra -->
                <div
                  class="relative h-full rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 transition-all duration-1000 ease-out"
                  :style="{ width: `${metricasProdutoId10.percentualComprometido}%` }"
                >
                  <!-- Efeito de Textura Industrial na Barra -->
                  <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.2)_0%,_transparent_100%)] opacity-30" />
                  <div class="absolute inset-y-0 right-0 w-[2px] bg-white/40 shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                </div>
              </div>

              <!-- Marcadores de Referência -->
              <div class="mt-3 flex justify-between px-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            <!-- Dashboard Interno de Volumes -->
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div class="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6 transition-colors hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.01]">
                <span class="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Saldo Total em Pátio</span>
                <span class="mt-2 block text-2xl font-black text-slate-900 dark:text-white">{{ metricasProdutoId10.saldoEstoque }} <span class="text-[10px] text-slate-400">m²</span></span>
              </div>
              <div class="rounded-[2rem] border border-brand-500/10 bg-brand-500/5 p-6 transition-colors hover:bg-brand-500/10">
                <span class="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">Pendente a Entregar</span>
                <span class="mt-2 block text-2xl font-black text-brand-600 dark:text-brand-400">{{ metricasProdutoId10.quantidadePendenteNotas }} <span class="text-[10px] opacity-60">m²</span></span>
              </div>
              <div class="rounded-[2rem] border border-emerald-500/10 bg-emerald-500/5 p-6 transition-colors hover:bg-emerald-500/10">
                <span class="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 uppercase">Saldo Livre Real</span>
                <span class="mt-2 block text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {{ Math.max(0, metricasProdutoId10.saldoEstoque - metricasProdutoId10.quantidadePendenteNotas).toFixed(2) }}
                  <span class="text-[10px] opacity-60">m²</span>
                </span>
                <p class="mt-1 text-[9px] font-bold text-emerald-500/60 uppercase">Disponível para venda</p>
              </div>
            </div>
          </div>

          <!-- Coluna 2: Métricas Secundárias e Cards de Operação -->
          <div class="grid grid-cols-2 gap-4 lg:flex lg:flex-col lg:justify-between lg:border-l lg:border-slate-100 lg:pl-10 lg:dark:border-white/5">
            <div class="flex items-center gap-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
                <ReceiptText class="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notas em Aberto</p>
                <p class="text-xl font-black text-slate-900 dark:text-white">{{ metricasProdutoId10.notasPendentes }}</p>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
                <Box class="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Filhos Vinculados</p>
                <p class="text-xl font-black text-slate-900 dark:text-white">{{ metricasProdutoId10.quantidadeFilhos }}</p>
              </div>
            </div>

            <!-- Card de Alerta/Ação Operacional -->
            <div class="col-span-2 mt-4 rounded-3xl border border-slate-100 p-5 dark:border-white/5">
              <div class="flex items-start gap-4">
                <AlertCircle class="h-5 w-5 shrink-0 text-brand-500" />
                <div>
                  <h4 class="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Leitura de Disponibilidade</h4>
                  <p class="mt-1 text-[11px] font-bold leading-relaxed text-slate-400">
                    O volume comprometido representa <span class="text-brand-500">{{ metricasProdutoId10.percentualComprometido }}%</span> do seu pátio atual de Telha Zinco.
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
      <article class="flex flex-col justify-between rounded-[2.5rem] border border-slate-200 bg-white p-8 dark:border-white/5 dark:bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-lg">
        <div>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Truck class="h-5 w-5" />
            </div>
            <h3 class="text-xl font-black text-slate-900 dark:text-white">Eficiência de Entrega Física</h3>
          </div>
          <p class="mt-2 text-sm font-bold text-slate-400">Relação entre peças faturadas e volume já carregado.</p>
        </div>

        <div class="mt-10 space-y-6">
          <div class="flex items-end justify-between">
            <div class="flex flex-col">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Status de Entrega</span>
              <div class="text-5xl font-black tracking-tighter text-brand-500">{{ metricas.percentualEntrega }}%</div>
            </div>
            <div class="text-right">
              <span class="block text-[10px] font-black uppercase tracking-widest text-slate-400">Restante a Entregar</span>
              <span class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{{ metricas.pecasPendentes }} <span class="text-xs text-slate-400">UN</span></span>
            </div>
          </div>

          <!-- Barra de Progresso Robusta -->
          <div class="relative h-6 w-full overflow-hidden rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
            <div 
              class="relative h-full rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 shadow-md shadow-brand-500/10 transition-all duration-1000 ease-out" 
              :style="{ width: `${metricas.percentualEntrega}%` }"
            >
              <!-- Textura Industrial -->
              <div class="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] opacity-20" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 pt-4">
            <div class="rounded-3xl border border-slate-100 bg-slate-50/50 p-5 transition-colors hover:bg-slate-100 dark:border-white/5 dark:bg-white/[0.02]">
              <span class="block text-[10px] font-black uppercase tracking-widest text-slate-400">Volume Total</span>
              <span class="text-2xl font-black text-slate-700 dark:text-slate-300">{{ metricas.pecasCompradas }} <span class="text-[10px] opacity-50">PCS</span></span>
            </div>
            <div class="rounded-3xl border border-emerald-500/10 bg-emerald-500/5 p-5 transition-colors hover:bg-emerald-500/10 dark:border-white/5 dark:bg-emerald-500/5">
              <span class="block text-[10px] font-black uppercase tracking-widest text-emerald-500">Já Entregue</span>
              <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ metricas.pecasEntregues }} <span class="text-[10px] opacity-50">PCS</span></span>
            </div>
          </div>
        </div>
      </article>

      <!-- Painel de Destaques Operacionais -->
      <article class="flex flex-col gap-6 rounded-[2.5rem] border border-slate-200 bg-white p-8 dark:border-white/5 dark:bg-slate-900">
        <div>
          <h3 class="text-xl font-black text-slate-900 dark:text-white">Leitura Operacional</h3>
          <p class="mt-1 text-sm font-bold text-slate-400">Destaques da volumetria física atual.</p>
        </div>

        <div class="space-y-4">
          <div class="flex items-center gap-4 rounded-3xl border border-slate-100 p-5 dark:border-white/5">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
              <Box class="h-6 w-6" />
            </div>
            <div>
              <p class="text-sm font-black text-slate-900 dark:text-white">Capacidade de Pátio</p>
              <p class="text-xs font-bold text-slate-400">Existem {{ metricas.pecasPendentes }} peças aguardando retirada física no pátio.</p>
            </div>
          </div>

          <div class="flex items-center gap-4 rounded-3xl border border-emerald-500/10 bg-emerald-500/5 p-5 dark:border-white/5">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <PackageCheck class="h-6 w-6" />
            </div>
            <div>
              <p class="text-sm font-black text-slate-900 dark:text-white">Fluxo de Conclusão</p>
              <p class="text-xs font-bold text-slate-400">{{ metricas.notasRetiradas }} notas já foram totalmente finalizadas pela logística.</p>
            </div>
          </div>

          <div class="flex items-center gap-4 rounded-3xl border border-brand-500/10 bg-brand-500/5 p-5 dark:border-white/5">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
              <AlertCircle class="h-6 w-6" />
            </div>
            <div>
              <p class="text-sm font-black text-slate-900 dark:text-white">Atenção Necessária</p>
              <p class="text-xs font-bold text-slate-400">{{ metricas.notasParciais }} notas estão com entregas parciais pendentes.</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
