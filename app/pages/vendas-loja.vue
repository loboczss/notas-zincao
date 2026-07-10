<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppPageShell from '../components/layout/AppPageShell.vue'
import { getApiFetch } from '../utils/api-fetch'
import { getApiErrorMessage } from '../utils/api-errors'
import type { IntegrimVendasLojaResponse } from '../../shared/types/IntegrimVendasLoja'

const pad = (n: number) => String(n).padStart(2, '0')
const hoje = new Date()
// input type=month usa YYYY-MM
const mesRef = ref(`${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}`)

const loading = ref(false)
const errorMessage = ref('')
const data = ref<IntegrimVendasLojaResponse | null>(null)

const brl = (n: number) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const intBR = (n: number) => (Number(n) || 0).toLocaleString('pt-BR')

// Do YYYY-MM seleciona primeiro e último dia do mês.
const rangeFromMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  const start = `${y}-${pad(m)}-01`
  const end = new Date(Date.UTC(y, m, 0))
  return { start, end: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}` }
}

const maxFaturamento = computed(() =>
  Math.max(1, ...(data.value?.lojas.map(l => l.faturamento) || [1])))

const carregar = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { start, end } = rangeFromMes(mesRef.value)
    data.value = await getApiFetch()<IntegrimVendasLojaResponse>('/api/integrim-notas/vendas-loja', {
      query: { date_start: start, date_end: end },
    })
  }
  catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Nao foi possivel carregar as vendas por loja.')
    data.value = null
  }
  finally {
    loading.value = false
  }
}

onMounted(carregar)

const variacaoClasse = (v: number | null) =>
  v === null
    ? 'text-slate-400'
    : v >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400'

const variacaoTexto = (v: number | null) =>
  v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toLocaleString('pt-BR')}%`
</script>

<template>
  <AppPageShell
    eyebrow="Integrim"
    title="Vendas por loja"
    description="Faturamento por empresa no mês, comparado ao período anterior de mesmo tamanho."
  >
    <template #headerAside>
      <div class="flex items-end gap-2">
        <label class="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
          Mês
          <input
            v-model="mesRef"
            type="month"
            class="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            @change="carregar"
          >
        </label>
        <button
          type="button"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          :disabled="loading"
          @click="carregar"
        >
          {{ loading ? 'Carregando…' : 'Atualizar' }}
        </button>
      </div>
    </template>

    <!-- erro -->
    <div
      v-if="errorMessage"
      class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
    >
      {{ errorMessage }}
    </div>

    <!-- totais -->
    <div v-if="data" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
          Faturamento total
        </p>
        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {{ brl(data.totais.faturamento) }}
        </p>
        <p class="mt-1 text-xs" :class="variacaoClasse(data.totais.variacao_pct)">
          {{ variacaoTexto(data.totais.variacao_pct) }} vs período anterior
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
          Itens vendidos
        </p>
        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {{ intBR(data.totais.num_notas) }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
          Lojas com venda
        </p>
        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {{ data.totais.lojas }}
        </p>
      </div>
    </div>

    <!-- ranking por loja -->
    <div
      v-if="data && data.lojas.length"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div
        v-for="loja in data.lojas"
        :key="loja.idempresa"
        class="border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-800"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="font-semibold text-slate-900 dark:text-slate-100">
              {{ loja.nome }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ intBR(loja.num_notas) }} itens
            </p>
          </div>
          <div class="text-right">
            <p class="font-bold text-slate-900 dark:text-slate-100">
              {{ brl(loja.faturamento) }}
            </p>
            <p class="text-xs" :class="variacaoClasse(loja.variacao_pct)">
              {{ variacaoTexto(loja.variacao_pct) }}
            </p>
          </div>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            class="h-full rounded-full bg-brand-500"
            :style="{ width: `${Math.round(100 * loja.faturamento / maxFaturamento)}%` }"
          />
        </div>
      </div>
    </div>

    <!-- vazio -->
    <div
      v-else-if="data && !loading"
      class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
    >
      Nenhuma venda no período selecionado.
    </div>
  </AppPageShell>
</template>
