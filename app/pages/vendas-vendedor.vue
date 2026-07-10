<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppPageShell from '../components/layout/AppPageShell.vue'
import { getApiFetch } from '../utils/api-fetch'
import { getApiErrorMessage } from '../utils/api-errors'
import type { IntegrimVendasVendedorResponse } from '../../shared/types/IntegrimVendasVendedor'
import { LOJA_NOMES } from '../../shared/types/IntegrimVendasLoja'

const pad = (n: number) => String(n).padStart(2, '0')
const hoje = new Date()
const mesRef = ref(`${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}`)
// '' = todas as lojas
const empresaRef = ref<string>('')

// Lojas ativas (com venda). 2 e 5 não têm movimento.
const lojasAtivas = [1, 3, 4, 6]

const loading = ref(false)
const errorMessage = ref('')
const data = ref<IntegrimVendasVendedorResponse | null>(null)

const brl = (n: number) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const intBR = (n: number) => (Number(n) || 0).toLocaleString('pt-BR')

const rangeFromMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number) as [number, number]
  const start = `${y}-${pad(m)}-01`
  const end = new Date(Date.UTC(y, m, 0))
  return { start, end: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}` }
}

const maxFaturamento = computed(() =>
  Math.max(1, ...(data.value?.vendedores.map(v => v.faturamento) || [1])))

const carregar = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { start, end } = rangeFromMes(mesRef.value)
    data.value = await getApiFetch()<IntegrimVendasVendedorResponse>('/api/integrim-notas/vendas-vendedor', {
      query: {
        date_start: start,
        date_end: end,
        ...(empresaRef.value ? { idempresa: empresaRef.value } : {}),
      },
    })
  }
  catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Nao foi possivel carregar as vendas por vendedor.')
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

const nomeLojaLabel = (id: number) => LOJA_NOMES[id] || `Loja ${id}`
</script>

<template>
  <AppPageShell
    eyebrow="Integrim"
    title="Vendas por vendedor"
    description="Faturamento por vendedor no mês. Itens sem vendedor atribuído aparecem como 'Sem vendedor'."
  >
    <template #headerAside>
      <div class="flex flex-wrap items-end gap-2">
        <label class="flex flex-col text-xs font-medium text-slate-500 dark:text-slate-400">
          Loja
          <select
            v-model="empresaRef"
            class="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            @change="carregar"
          >
            <option value="">
              Todas
            </option>
            <option v-for="id in lojasAtivas" :key="id" :value="String(id)">
              {{ nomeLojaLabel(id) }}
            </option>
          </select>
        </label>
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
          Vendedores com venda
        </p>
        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {{ data.totais.vendedores }}
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
          Sem vendedor atribuído
        </p>
        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {{ brl(data.totais.faturamento_sem_vendedor) }}
        </p>
        <p class="mt-1 text-xs text-slate-400">
          não distribuído entre vendedores
        </p>
      </div>
    </div>

    <!-- ranking -->
    <div
      v-if="data && data.vendedores.length"
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div
        v-for="(v, i) in data.vendedores"
        :key="v.idvendedor"
        class="border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-800"
        :class="{ 'bg-slate-50 dark:bg-slate-950/40': v.idvendedor === 0 }"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              {{ v.idvendedor === 0 ? '—' : i + 1 }}
            </span>
            <div>
              <p class="font-semibold text-slate-900 dark:text-slate-100">
                {{ v.nome }}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ intBR(v.num_itens) }} itens
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold text-slate-900 dark:text-slate-100">
              {{ brl(v.faturamento) }}
            </p>
            <p class="text-xs" :class="variacaoClasse(v.variacao_pct)">
              {{ variacaoTexto(v.variacao_pct) }}
            </p>
          </div>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            class="h-full rounded-full"
            :class="v.idvendedor === 0 ? 'bg-slate-400' : 'bg-brand-500'"
            :style="{ width: `${Math.round(100 * v.faturamento / maxFaturamento)}%` }"
          />
        </div>
      </div>
    </div>

    <div
      v-else-if="data && !loading"
      class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
    >
      Nenhuma venda no período. Se a tabela ainda não foi populada, rode o sync do Integrim.
    </div>
  </AppPageShell>
</template>
