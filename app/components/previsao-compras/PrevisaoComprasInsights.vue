<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertOctagon, BarChart4, CalendarRange, Loader2 } from 'lucide-vue-next'
import type {
  IntegrimAbcMetric,
  IntegrimAbcResponse,
  IntegrimRupturaResponse,
  IntegrimSazonalidadeResponse,
} from '../../../shared/types/IntegrimNotas'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../utils/stock-integrin-format'
import SelectInput from '../SelectInput.vue'

const props = withDefaults(defineProps<{
  abc: IntegrimAbcResponse | null
  ruptura: IntegrimRupturaResponse | null
  sazonalidade: IntegrimSazonalidadeResponse | null
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'loadRuptura'): void
  (e: 'loadAbc', metric: IntegrimAbcMetric): void
  (e: 'loadSazonalidade'): void
}>()

type SubTab = 'ruptura' | 'abc' | 'sazonalidade'
const activeSub = ref<SubTab>('ruptura')
const abcMetric = ref<IntegrimAbcMetric>('faturamento')

const subTabs: Array<{ id: SubTab, label: string, icon: any }> = [
  { id: 'ruptura', label: 'Risco de ruptura', icon: AlertOctagon },
  { id: 'abc', label: 'Curva ABC', icon: BarChart4 },
  { id: 'sazonalidade', label: 'Sazonalidade', icon: CalendarRange },
]

const metricOptions: Array<{ value: IntegrimAbcMetric, label: string }> = [
  { value: 'faturamento', label: 'Faturamento' },
  { value: 'margem', label: 'Margem' },
  { value: 'quantidade', label: 'Quantidade' },
]

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const loadActive = () => {
  if (activeSub.value === 'ruptura') emit('loadRuptura')
  else if (activeSub.value === 'abc') emit('loadAbc', abcMetric.value)
  else emit('loadSazonalidade')
}

const selectSub = (tab: SubTab) => {
  activeSub.value = tab
  loadActive()
}

const changeMetric = (metric: IntegrimAbcMetric) => {
  abcMetric.value = metric
  emit('loadAbc', metric)
}

const classeTone: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  B: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  C: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const metricValue = (valor: number) =>
  abcMetric.value === 'quantidade'
    ? `${formatStockIntegrinNumber(valor, 0)} un`
    : formatStockIntegrinCurrency(valor)

const sazonalidadeMax = computed(() => {
  const rows = props.sazonalidade?.rows || []
  return Math.max(1, ...rows.map(r => r.faturamento_share))
})

const sazonalidadePorMes = computed(() => {
  const map = new Map((props.sazonalidade?.rows || []).map(r => [r.mes, r]))
  return monthLabels.map((label, index) => {
    const row = map.get(index + 1)
    return {
      label,
      faturamento: row?.faturamento || 0,
      qtd: row?.qtd || 0,
      share: row?.faturamento_share || 0,
    }
  })
})

onMounted(loadActive)
</script>

<template>
  <div class="space-y-4">
    <!-- Sub abas -->
    <div class="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <button
        v-for="tab in subTabs"
        :key="tab.id"
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition sm:flex-none"
        :class="activeSub === tab.id
          ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
        @click="selectSub(tab.id)"
      >
        <component :is="tab.icon" class="h-4 w-4" />
        {{ tab.label }}
      </button>
    </div>

    <div v-if="props.loading" class="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 class="h-4 w-4 animate-spin" /> Calculando...
    </div>

    <!-- RUPTURA -->
    <template v-else-if="activeSub === 'ruptura'">
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Produtos em risco</p>
          <p class="mt-1 text-2xl font-extrabold text-rose-600 dark:text-rose-400">{{ formatStockIntegrinNumber(props.ruptura?.resumo.total_risco || 0, 0) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Custo p/ repor</p>
          <p class="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{{ formatStockIntegrinCurrency(props.ruptura?.resumo.custo_total || 0) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Lead time / cobertura</p>
          <p class="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            {{ props.ruptura?.parametros.lead_time_dias ?? 7 }}<span class="text-sm font-bold text-slate-400"> + {{ props.ruptura?.parametros.coverage_days ?? 45 }}d</span>
          </p>
        </div>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/60">
            <tr>
              <th class="px-3 py-2.5 text-left">Produto</th>
              <th class="px-3 py-2.5 text-right">Saldo</th>
              <th class="px-3 py-2.5 text-right">Giro/dia</th>
              <th class="px-3 py-2.5 text-right">Cobertura</th>
              <th class="px-3 py-2.5 text-right">Ruptura em</th>
              <th class="px-3 py-2.5 text-right">Comprar</th>
              <th class="px-3 py-2.5 text-right">Custo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="row in props.ruptura?.rows || []" :key="`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`" class="hover:bg-slate-50 dark:hover:bg-slate-900/40">
              <td class="px-3 py-2.5">
                <div class="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{{ row.descricao || `Produto ${row.idproduto}/${row.idsubproduto}` }}</div>
                <div class="text-[10px] text-slate-400">Empresa {{ row.idempresa }} • {{ row.idproduto }}/{{ row.idsubproduto }}</div>
              </td>
              <td class="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{{ formatStockIntegrinNumber(row.saldo_disponivel, 0) }}</td>
              <td class="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{{ formatStockIntegrinNumber(row.giro_diario, 2) }}</td>
              <td class="px-3 py-2.5 text-right">
                <span class="font-bold" :class="(row.dias_cobertura ?? 999) <= row.lead_time_dias ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'">
                  {{ row.dias_cobertura != null ? `${formatStockIntegrinNumber(row.dias_cobertura, 0)}d` : '—' }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{{ row.data_ruptura || '—' }}</td>
              <td class="px-3 py-2.5 text-right font-bold text-slate-800 dark:text-slate-100">{{ formatStockIntegrinNumber(row.sugestao_compra, 0) }}</td>
              <td class="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{{ formatStockIntegrinCurrency(row.custo_sugestao) }}</td>
            </tr>
            <tr v-if="!(props.ruptura?.rows || []).length">
              <td colspan="7" class="px-3 py-8 text-center text-sm text-slate-400">Nenhum produto em risco de ruptura para os parâmetros atuais.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ABC -->
    <template v-else-if="activeSub === 'abc'">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="grid flex-1 grid-cols-3 gap-3">
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <p class="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Classe A (80%)</p>
            <p class="mt-1 text-xl font-extrabold text-emerald-700 dark:text-emerald-300">{{ formatStockIntegrinNumber(props.abc?.resumo.classe_a || 0, 0) }}</p>
          </div>
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p class="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Classe B (15%)</p>
            <p class="mt-1 text-xl font-extrabold text-amber-700 dark:text-amber-300">{{ formatStockIntegrinNumber(props.abc?.resumo.classe_b || 0, 0) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Classe C (5%)</p>
            <p class="mt-1 text-xl font-extrabold text-slate-700 dark:text-slate-300">{{ formatStockIntegrinNumber(props.abc?.resumo.classe_c || 0, 0) }}</p>
          </div>
        </div>
        <label class="space-y-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Classificar por</span>
          <SelectInput :model-value="abcMetric" class="h-10 w-44" @update:model-value="changeMetric($event as IntegrimAbcMetric)">
            <option v-for="opt in metricOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </SelectInput>
        </label>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-900/60">
            <tr>
              <th class="px-3 py-2.5 text-left">#</th>
              <th class="px-3 py-2.5 text-left">Produto</th>
              <th class="px-3 py-2.5 text-right">Valor</th>
              <th class="px-3 py-2.5 text-right">Part.</th>
              <th class="px-3 py-2.5 text-right">Acum.</th>
              <th class="px-3 py-2.5 text-center">Classe</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="(row, idx) in props.abc?.rows || []" :key="`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`" class="hover:bg-slate-50 dark:hover:bg-slate-900/40">
              <td class="px-3 py-2.5 text-slate-400">{{ idx + 1 }}</td>
              <td class="px-3 py-2.5">
                <div class="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{{ row.descricao || `Produto ${row.idproduto}/${row.idsubproduto}` }}</div>
                <div class="text-[10px] text-slate-400">Empresa {{ row.idempresa }} • {{ row.idproduto }}/{{ row.idsubproduto }}</div>
              </td>
              <td class="px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100">{{ metricValue(row.valor) }}</td>
              <td class="px-3 py-2.5 text-right text-slate-500 dark:text-slate-400">{{ formatStockIntegrinNumber(row.participacao, 1) }}%</td>
              <td class="px-3 py-2.5 text-right text-slate-500 dark:text-slate-400">{{ formatStockIntegrinNumber(row.acumulado, 1) }}%</td>
              <td class="px-3 py-2.5 text-center">
                <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold" :class="classeTone[row.classe]">{{ row.classe }}</span>
              </td>
            </tr>
            <tr v-if="!(props.abc?.rows || []).length">
              <td colspan="6" class="px-3 py-8 text-center text-sm text-slate-400">Sem dados para classificar no período.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- SAZONALIDADE -->
    <template v-else>
      <div
        v-if="props.sazonalidade?.requer_backfill"
        class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
      >
        A sazonalidade precisa do histórico diário de vendas (tabela de vendas por dia), que ainda está vazia.
        Rode a sincronização das notas para habilitar a curva por mês do ano.
      </div>
      <div v-else class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/50">
        <p class="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">Faturamento por mês do ano (todo o histórico)</p>
        <div class="space-y-2.5">
          <div v-for="mes in sazonalidadePorMes" :key="mes.label" class="flex items-center gap-3">
            <span class="w-8 shrink-0 text-xs font-bold text-slate-400">{{ mes.label }}</span>
            <div class="h-6 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
              <div
                class="h-full rounded-md bg-brand-500/80 transition-all"
                :style="{ width: `${Math.min(100, (mes.share / sazonalidadeMax) * 100)}%` }"
              />
            </div>
            <span class="w-28 shrink-0 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{{ formatStockIntegrinCurrency(mes.faturamento) }}</span>
            <span class="w-12 shrink-0 text-right text-[11px] text-slate-400">{{ formatStockIntegrinNumber(mes.share, 0) }}%</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
