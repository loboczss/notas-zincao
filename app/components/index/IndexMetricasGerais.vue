<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  BadgeDollarSign,
  CircleDashed,
  PackageCheck,
  RefreshCw,
  ReceiptText,
  ShoppingBag,
} from 'lucide-vue-next'
import Botao from '../Botao.vue'
import { useNotasStore } from '../../stores'

const notasStore = useNotasStore()
const { notas, loadingNotas, errorMessage } = storeToRefs(notasStore)

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const metricas = computed(() => {
  const totalNotas = notas.value.length
  const valorTotal = notas.value.reduce((acc, item) => acc + (item.valor_total || 0), 0)
  const notasRetiradas = notas.value.filter(item => item.status_retirada === 'retirada').length
  const notasParciais = notas.value.filter(item => item.status_retirada === 'parcial').length
  const notasPendentes = notas.value.filter(item => item.status_retirada === 'pendente').length

  return [
    {
      titulo: 'Total de notas',
      valor: String(totalNotas),
      detalhe: 'Quantidade geral cadastrada',
      icon: ReceiptText,
      iconClass: 'text-slate-700 dark:text-slate-300',
      badgeClass: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      titulo: 'Valor total',
      valor: formatCurrency(valorTotal),
      detalhe: 'Soma das notas cadastradas',
      icon: BadgeDollarSign,
      iconClass: 'text-emerald-700 dark:text-emerald-400',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      titulo: 'Total retirado',
      valor: String(notasRetiradas),
      detalhe: 'Notas com retirada completa',
      icon: PackageCheck,
      iconClass: 'text-blue-700 dark:text-blue-400',
      badgeClass: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      titulo: 'Notas parciais',
      valor: String(notasParciais),
      detalhe: 'Retirada parcial em andamento',
      icon: ShoppingBag,
      iconClass: 'text-amber-700 dark:text-amber-400',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      titulo: 'Notas pendentes',
      valor: String(notasPendentes),
      detalhe: 'Aguardando retirada',
      icon: CircleDashed,
      iconClass: 'text-rose-700 dark:text-rose-400',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/30',
    },
  ]
})

const panorama = computed(() => {
  const totalNotas = notas.value.length
  const valorTotal = notas.value.reduce((acc, item) => acc + (item.valor_total || 0), 0)
  const notasRetiradas = notas.value.filter(item => item.status_retirada === 'retirada').length
  const notasParciais = notas.value.filter(item => item.status_retirada === 'parcial').length
  const notasPendentes = notas.value.filter(item => item.status_retirada === 'pendente').length

  const ticketMedio = totalNotas > 0 ? valorTotal / totalNotas : 0
  const percentualRetirada = totalNotas > 0 ? Math.round((notasRetiradas / totalNotas) * 100) : 0

  return {
    totalNotas,
    ticketMedio,
    percentualRetirada,
    distribuicao: [
      {
        label: 'Retiradas',
        valor: notasRetiradas,
        largura: totalNotas > 0 ? (notasRetiradas / totalNotas) * 100 : 0,
        classe: 'bg-blue-500',
      },
      {
        label: 'Parciais',
        valor: notasParciais,
        largura: totalNotas > 0 ? (notasParciais / totalNotas) * 100 : 0,
        classe: 'bg-amber-400',
      },
      {
        label: 'Pendentes',
        valor: notasPendentes,
        largura: totalNotas > 0 ? (notasPendentes / totalNotas) * 100 : 0,
        classe: 'bg-rose-400',
      },
    ],
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
  <section class="space-y-6">
    <p v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
      {{ errorMessage }}
    </p>

    <div class="flex justify-end">
      <Botao variant="secondary" :disabled="loadingNotas" class="w-full sm:w-auto" @click="carregarMetricas">
        <span class="inline-flex items-center gap-2">
          <RefreshCw class="h-4 w-4" :class="loadingNotas ? 'animate-spin' : ''" />
          {{ loadingNotas ? 'Atualizando...' : 'Atualizar métricas' }}
        </span>
      </Botao>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <article
        v-for="item in metricas"
        :key="item.titulo"
        class="rounded-[20px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors duration-300"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {{ item.titulo }}
            </p>
            <p class="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
              {{ item.valor }}
            </p>
          </div>

          <div class="rounded-2xl p-3 transition-colors duration-300" :class="item.badgeClass">
            <component :is="item.icon" class="h-5 w-5" :class="item.iconClass" />
          </div>
        </div>

        <div class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ item.detalhe }}
          </p>
        </div>
      </article>
    </div>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <article class="rounded-[20px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm md:p-6 transition-colors duration-300">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Distribuição operacional
            </p>
            <h2 class="mt-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-xl">
              Como as notas estão distribuídas hoje
            </h2>
          </div>

          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-right">
            <p class="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Base</p>
            <p class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ panorama.totalNotas }} notas</p>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          <div v-for="item in panorama.distribuicao" :key="item.label" class="space-y-2">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="font-medium text-slate-700 dark:text-slate-300">{{ item.label }}</span>
              <span class="text-slate-500 dark:text-slate-400">{{ item.valor }}</span>
            </div>
            <div class="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div class="h-full rounded-full transition-all" :class="item.classe" :style="{ width: `${item.largura}%` }" />
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-[20px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm md:p-6 transition-colors duration-300">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Leitura rápida
        </p>
        <h2 class="mt-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-xl">
          Indicadores principais
        </h2>
        <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Uma leitura direta para entender o valor médio por nota e o percentual já concluído.
        </p>

        <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Valor médio</p>
            <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{{ formatCurrency(panorama.ticketMedio) }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Concluído</p>
            <p class="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{{ panorama.percentualRetirada }}%</p>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
