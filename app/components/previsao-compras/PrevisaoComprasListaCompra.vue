<script setup lang="ts">
import { computed, reactive } from 'vue'
import { AlertTriangle, RefreshCw, ShoppingCart, TrendingDown, TrendingUp, Wallet } from 'lucide-vue-next'
import type {
  IntegrimListaCompraQuery,
  IntegrimListaCompraRow,
  IntegrimListaCompraSort,
  IntegrimListaCompraStats,
} from '../../../shared/types/IntegrimNotas'
import { formatStockIntegrinNumber } from '../../utils/stock-integrin-format'

const props = withDefaults(defineProps<{
  rows: IntegrimListaCompraRow[]
  stats: IntegrimListaCompraStats | null
  loading?: boolean
  totalItens?: number
}>(), {
  loading: false,
  totalItens: 0,
})

const emit = defineEmits<{
  (e: 'fetch', query: IntegrimListaCompraQuery): void
}>()

const filtros = reactive({
  idempresa: '' as string,
  leadTime: '7',
  coverage: '30',
  serviceLevel: '0.95',
  horizon: '90',
  sort: 'risco' as IntegrimListaCompraSort,
  search: '',
})

const buildQuery = (page = 1): IntegrimListaCompraQuery => ({
  idempresa: filtros.idempresa ? Number(filtros.idempresa) : null,
  lead_time_dias: Number(filtros.leadTime || 7),
  coverage_days: Number(filtros.coverage || 30),
  service_level: Number(filtros.serviceLevel || 0.95),
  horizon_days: Number(filtros.horizon || 90),
  only_buy: true,
  sort: filtros.sort,
  search: filtros.search,
  page,
  page_size: 50,
})

const aplicar = () => emit('fetch', buildQuery(1))

const moeda = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const empresas = ['1', '2', '3', '4', '5', '6']

const abcTone: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  B: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  C: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}
const xyzTone: Record<string, string> = {
  X: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Y: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Z: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
}
const confiancaTone: Record<string, string> = {
  alta: 'text-emerald-600 dark:text-emerald-400',
  media: 'text-amber-600 dark:text-amber-400',
  baixa: 'text-rose-600 dark:text-rose-400',
}

const rupturaTone = (dias: number | null) => {
  if (dias === null) return 'text-slate-400'
  if (dias <= 2) return 'text-rose-600 dark:text-rose-400 font-bold'
  if (dias <= 7) return 'text-amber-600 dark:text-amber-400 font-semibold'
  return 'text-slate-600 dark:text-slate-300'
}

const temItens = computed(() => props.rows.length > 0)
</script>

<template>
  <div class="space-y-4">
    <!-- KPIs da decisao -->
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <ShoppingCart class="h-4 w-4 text-brand-500" /> Itens para comprar
        </div>
        <div class="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
          {{ formatStockIntegrinNumber(props.stats?.itens_comprar || 0, 0) }}
        </div>
        <div class="text-[11px] text-slate-400">cruzaram o ponto de reposição</div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <Wallet class="h-4 w-4 text-brand-500" /> Capital necessário
        </div>
        <div class="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{{ moeda(props.stats?.capital_total || 0) }}</div>
        <div class="text-[11px] text-slate-400">para repor tudo da lista</div>
      </div>
      <div class="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10">
        <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-rose-500">
          <AlertTriangle class="h-4 w-4" /> Faturamento em risco
        </div>
        <div class="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300">{{ moeda(props.stats?.risco_total || 0) }}</div>
        <div class="text-[11px] text-rose-500/80">margem perdida se não repor a tempo</div>
      </div>
    </div>

    <!-- Controles -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label class="space-y-1 block">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Empresa</span>
          <select v-model="filtros.idempresa" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <option value="">Todas</option>
            <option v-for="e in empresas" :key="e" :value="e">Empresa {{ e }}</option>
          </select>
        </label>
        <label class="space-y-1 block">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Lead time (dias)</span>
          <input v-model="filtros.leadTime" type="number" min="0" max="365" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        </label>
        <label class="space-y-1 block">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cobertura (dias)</span>
          <input v-model="filtros.coverage" type="number" min="1" max="365" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        </label>
        <label class="space-y-1 block">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Nível de serviço</span>
          <select v-model="filtros.serviceLevel" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <option value="0.90">90%</option>
            <option value="0.95">95%</option>
            <option value="0.975">97,5%</option>
            <option value="0.99">99%</option>
          </select>
        </label>
        <label class="space-y-1 block">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Histórico (dias)</span>
          <select v-model="filtros.horizon" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <option value="30">30</option>
            <option value="60">60</option>
            <option value="90">90</option>
            <option value="180">180</option>
            <option value="365">365</option>
          </select>
        </label>
        <label class="space-y-1 block">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ordenar por</span>
          <select v-model="filtros.sort" class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <option value="risco">Dinheiro em risco</option>
            <option value="ruptura">Dias até ruptura</option>
            <option value="sugestao">Sugestão de compra</option>
            <option value="faturamento">Faturamento</option>
          </select>
        </label>
      </div>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          v-model="filtros.search"
          type="search"
          placeholder="Buscar produto…"
          class="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          @keyup.enter="aplicar"
        >
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
          :disabled="props.loading"
          @click="aplicar"
        >
          <RefreshCw class="h-4 w-4" :class="props.loading ? 'animate-spin' : ''" />
          Recalcular
        </button>
      </div>
    </div>

    <!-- Tabela -->
    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <table class="w-full min-w-[920px] text-sm">
        <thead>
          <tr class="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800">
            <th class="px-3 py-2.5">Produto</th>
            <th class="px-3 py-2.5 text-right">Estoque</th>
            <th class="px-3 py-2.5 text-right">Demanda/dia</th>
            <th class="px-3 py-2.5 text-right">Ponto rep.</th>
            <th class="px-3 py-2.5 text-right">Ruptura</th>
            <th class="px-3 py-2.5 text-right">Comprar</th>
            <th class="px-3 py-2.5 text-right">Capital</th>
            <th class="px-3 py-2.5 text-right">Risco</th>
            <th class="px-3 py-2.5 text-center">Classe</th>
            <th class="px-3 py-2.5 text-center">Confiança</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading && !temItens">
            <td colspan="10" class="px-3 py-8 text-center text-slate-400">Calculando…</td>
          </tr>
          <tr v-else-if="!temItens">
            <td colspan="10" class="px-3 py-8 text-center text-slate-400">Nenhum item precisa de compra agora. 🎉</td>
          </tr>
          <tr
            v-for="row in props.rows"
            :key="`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`"
            class="border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
          >
            <td class="px-3 py-2.5">
              <div class="font-semibold text-slate-800 dark:text-slate-100">{{ row.descricao }}</div>
              <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>Emp. {{ row.idempresa }}</span>
                <span>·</span>
                <span>{{ row.idproduto }}/{{ row.idsubproduto }}</span>
                <span v-if="row.estoque_ausente" class="rounded bg-amber-100 px-1 font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">sem cadastro de estoque</span>
              </div>
            </td>
            <td class="px-3 py-2.5 text-right tabular-nums">{{ formatStockIntegrinNumber(row.saldo_disponivel, 0) }}</td>
            <td class="px-3 py-2.5 text-right tabular-nums">
              {{ formatStockIntegrinNumber(row.demanda_diaria, 1) }}
              <span v-if="row.tendencia_percent != null" class="ml-1 inline-flex items-center text-[11px]" :class="row.tendencia_percent >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                <TrendingUp v-if="row.tendencia_percent >= 0" class="h-3 w-3" />
                <TrendingDown v-else class="h-3 w-3" />
              </span>
            </td>
            <td class="px-3 py-2.5 text-right tabular-nums text-slate-500">{{ formatStockIntegrinNumber(row.ponto_reposicao, 0) }}</td>
            <td class="px-3 py-2.5 text-right tabular-nums" :class="rupturaTone(row.dias_ate_ruptura)">
              {{ row.dias_ate_ruptura == null ? '—' : `${formatStockIntegrinNumber(row.dias_ate_ruptura, 1)}d` }}
            </td>
            <td class="px-3 py-2.5 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">{{ formatStockIntegrinNumber(row.sugestao_compra, 0) }}</td>
            <td class="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{{ moeda(row.capital_necessario) }}</td>
            <td class="px-3 py-2.5 text-right font-semibold tabular-nums text-rose-600 dark:text-rose-400">{{ moeda(row.dinheiro_em_risco) }}</td>
            <td class="px-3 py-2.5 text-center">
              <span class="mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold" :class="abcTone[row.classe_abc]">{{ row.classe_abc }}</span>
              <span class="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold" :class="xyzTone[row.classe_xyz]">{{ row.classe_xyz }}</span>
            </td>
            <td class="px-3 py-2.5 text-center text-[11px] font-bold capitalize" :class="confiancaTone[row.confianca]">{{ row.confianca }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="px-1 text-[11px] text-slate-400">
      Comprar quando o estoque cruza o <strong>ponto de reposição</strong> = demanda diária × lead time + estoque de segurança
      (nível de serviço × variabilidade). Classe <strong>ABC</strong> = importância no faturamento; <strong>XYZ</strong> = previsibilidade da demanda.
    </p>
  </div>
</template>
