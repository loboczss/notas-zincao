<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
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
import { useNotasStore } from '../../stores'

const notasStore = useNotasStore()
const { notas, loadingNotas, errorMessage } = storeToRefs(notasStore)

// Helper para converter string em número com segurança
const toNumber = (val: any) => {
  if (typeof val === 'number') return val
  if (!val) return 0
  const n = parseFloat(String(val).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const metricas = computed(() => {
  const totalNotas = notas.value.length
  
  // Status das Notas
  const notasRetiradas = notas.value.filter(item => item.status_retirada === 'retirada').length
  const notasParciais = notas.value.filter(item => item.status_retirada === 'parcial').length
  const notasPendentes = notas.value.filter(item => item.status_retirada === 'pendente').length
  
  // Volume Físico (Soma de Peças)
  let pecasCompradas = 0
  let pecasEntregues = 0

  notas.value.forEach(nota => {
    if (nota.produtos && Array.isArray(nota.produtos)) {
      nota.produtos.forEach((p: any) => {
        pecasCompradas += toNumber(p.quantidade)
        pecasEntregues += toNumber(p.quantidade_retirada)
      })
    }
  })

  const pecasCompradasRounded = Math.round(pecasCompradas * 100) / 100
  const pecasEntreguesRounded = Math.round(pecasEntregues * 100) / 100
  const percentualEntrega = pecasCompradas > 0 ? Math.round((pecasEntregues / pecasCompradas) * 100) : 0

  return {
    totalNotas,
    notasRetiradas,
    notasParciais,
    notasPendentes,
    pecasCompradas: pecasCompradasRounded,
    pecasEntregues: pecasEntreguesRounded,
    pecasPendentes: Math.max(0, Math.round((pecasCompradas - pecasEntregues) * 100) / 100),
    percentualEntrega
  }
})

const carregarMetricas = async () => {
  await notasStore.fetchNotas()
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

      <Botao variant="secondary" :disabled="loadingNotas" class="rounded-2xl" @click="carregarMetricas">
        <RefreshCw class="h-4 w-4" :class="loadingNotas ? 'animate-spin' : ''" />
        <span class="ml-2">{{ loadingNotas ? 'Atualizando...' : 'Atualizar Dados' }}</span>
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
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <Truck class="h-6 w-6" />
        </div>
        <div>
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Parciais</span>
          <div class="mt-1 text-3xl font-black text-amber-600 dark:text-amber-400">{{ metricas.notasParciais }}</div>
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

    <!-- Seção de Peças e Volume Físico -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <!-- Painel de Progresso Físico -->
      <article class="flex flex-col justify-between rounded-[2.5rem] border border-slate-200 bg-white p-8 dark:border-white/5 dark:bg-slate-900">
        <div>
          <h3 class="text-xl font-black text-slate-900 dark:text-white">Eficiência de Entrega Física</h3>
          <p class="mt-1 text-sm font-bold text-slate-400">Total de peças compradas vs. volume já retirado pelo cliente.</p>
        </div>

        <div class="mt-10 space-y-6">
          <div class="flex items-end justify-between">
            <div class="text-5xl font-black text-brand-500">{{ metricas.percentualEntrega }}%</div>
            <div class="text-right">
              <span class="block text-[10px] font-black uppercase tracking-widest text-slate-400">Peças Pendentes</span>
              <span class="text-2xl font-black text-slate-900 dark:text-white">{{ metricas.pecasPendentes }}</span>
            </div>
          </div>

          <div class="h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            <div 
              class="h-full rounded-full bg-brand-500 transition-all duration-1000" 
              :style="{ width: `${metricas.percentualEntrega}%` }"
            />
          </div>

          <div class="grid grid-cols-2 gap-4 pt-4">
            <div class="rounded-3xl border border-slate-100 bg-slate-50/50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
              <span class="block text-[10px] font-black uppercase tracking-widest text-slate-400">Total Vendido</span>
              <span class="text-xl font-black text-slate-700 dark:text-slate-300">{{ metricas.pecasCompradas }}</span>
            </div>
            <div class="rounded-3xl border border-emerald-500/10 bg-emerald-500/5 p-4 dark:border-white/5 dark:bg-emerald-500/5">
              <span class="block text-[10px] font-black uppercase tracking-widest text-emerald-500">Total Entregue</span>
              <span class="text-xl font-black text-emerald-600 dark:text-emerald-400">{{ metricas.pecasEntregues }}</span>
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
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
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
