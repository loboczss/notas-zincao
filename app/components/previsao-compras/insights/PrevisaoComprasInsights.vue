<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertOctagon, BarChart4, CalendarRange, Loader2 } from 'lucide-vue-next'
import type {
  IntegrimAbcMetric,
  IntegrimAbcResponse,
  IntegrimProdutoValor,
  IntegrimRupturaResponse,
  IntegrimSazonalidadeResponse,
  IntegrimSazonalidadeRow,
} from '../../../../shared/types/IntegrimNotas'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../../utils/stock-integrin-format'
import { usePrevisaoComprasStore } from '../../../stores'
import { getApiFetch } from '../../../utils/api-fetch'

// Componentes Reutilizáveis
import SelectInput from '../../SelectInput.vue'
import InfoTooltip from '../../InfoTooltip.vue'

const store = usePrevisaoComprasStore()

const abrirDetalhe = async (row: { idempresa: number; idproduto: number; idsubproduto: number; descricao?: string | null }) => {
  // 1. Tentar encontrar na lista de produtos já carregada na store
  const found = store.produtos.find((p: IntegrimProdutoValor) => 
    Number(p.idempresa) === Number(row.idempresa) && 
    Number(p.idproduto) === Number(row.idproduto) && 
    Number(p.idsubproduto) === Number(row.idsubproduto)
  )
  if (found) {
    store.produtoSelecionado = found
    return
  }

  // 2. Se não encontrar, buscar via API
  const apiFetch = getApiFetch()
  try {
    const data = await apiFetch<any>('/api/integrim-notas/catalog/produtos', {
      query: {
        idempresa: row.idempresa,
        search: `${row.idproduto}/${row.idsubproduto}`,
        page_size: 1
      }
    })
    if (data?.produtos?.length) {
      const match = data.produtos.find((p: IntegrimProdutoValor) => 
        Number(p.idempresa) === Number(row.idempresa) && 
        Number(p.idproduto) === Number(row.idproduto) && 
        Number(p.idsubproduto) === Number(row.idsubproduto)
      )
      if (match) {
        store.produtoSelecionado = match
        return
      }
    }
  } catch (e) {
    console.error('Erro ao buscar detalhes do produto:', e)
  }

  // 3. Fallback mock
  store.produtoSelecionado = {
    id: `${row.idempresa}-${row.idproduto}-${row.idsubproduto}`,
    idempresa: row.idempresa,
    idproduto: row.idproduto,
    idsubproduto: row.idsubproduto,
    descricao: row.descricao || null,
    saldo_disponivel: 0,
    giro_diario: 0,
    dias_cobertura: null,
    sugestao_compra: 0,
    score_valor: 0,
    faturamento_periodo: 0,
    margem_periodo: 0,
    custo_unit: null,
    updated_at: new Date().toISOString(),
    date_start: '',
    date_end: '',
    coverage_days: 45,
    prev_qtd_periodo: 0,
    prev_faturamento_periodo: 0,
    variacao_qtd_percent: null,
    variacao_faturamento_percent: null,
    ai_oportunidade: null,
  } as IntegrimProdutoValor
}

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
  (e: 'loadSazonalidade', ano?: number | null): void
}>()

type SubTab = 'ruptura' | 'abc' | 'sazonalidade'
const activeSub = ref<SubTab>('ruptura')
const abcMetric = ref<IntegrimAbcMetric>('faturamento')

// Ano selecionado na sazonalidade. undefined = ainda não inicializado (assume o
// ano mais recente quando os dados chegam); null = "Todos os anos" (consolidado).
const anoSelecionado = ref<number | null | undefined>(undefined)

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
  else emit('loadSazonalidade', anoSelecionado.value ?? undefined)
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

const sazonalidadePorMes = computed(() => {
  const map = new Map<number, IntegrimSazonalidadeRow>(
    (props.sazonalidade?.rows || []).map((r: IntegrimSazonalidadeRow) => [r.mes, r])
  )
  return monthLabels.map((label, index) => {
    const row = map.get(index + 1)
    return {
      mes: index + 1,
      label,
      faturamento: row?.faturamento || 0,
      qtd: row?.qtd || 0,
      numNotas: row?.num_notas || 0,
      share: row?.faturamento_share || 0,
      qtdShare: row?.qtd_share || 0,
    }
  })
})

type MesSazonal = {
  mes: number
  label: string
  faturamento: number
  qtd: number
  numNotas: number
  share: number
  qtdShare: number
}
const emptyMes: MesSazonal = { mes: 1, label: 'Jan', faturamento: 0, qtd: 0, numNotas: 0, share: 0, qtdShare: 0 }

// Resumo estatístico da curva sazonal
const sazonalidadeResumo = computed(() => {
  const meses = sazonalidadePorMes.value
  const comVenda = meses.filter(m => m.faturamento > 0)
  const totalFaturamento = meses.reduce((acc, m) => acc + m.faturamento, 0)
  const totalQtd = meses.reduce((acc, m) => acc + m.qtd, 0)
  const totalNotas = meses.reduce((acc, m) => acc + m.numNotas, 0)
  const mediaMensal = comVenda.length ? totalFaturamento / comVenda.length : 0

  let pico = meses[0] ?? emptyMes
  let vale = comVenda[0] ?? meses[0] ?? emptyMes
  for (const m of meses) {
    if (m.faturamento > pico.faturamento) pico = m
  }
  for (const m of comVenda) {
    if (m.faturamento < vale.faturamento) vale = m
  }

  return {
    totalFaturamento,
    totalQtd,
    totalNotas,
    mediaMensal,
    pico,
    vale: comVenda.length ? vale : null,
    mesesComVenda: comVenda.length,
  }
})

// Geometria do gráfico combinado (barras de faturamento + linha de quantidade)
const CHART = { w: 720, h: 280, top: 20, right: 52, bottom: 38, left: 68 }
const chartPlot = computed(() => ({
  w: CHART.w - CHART.left - CHART.right,
  h: CHART.h - CHART.top - CHART.bottom,
}))

const maxFaturamento = computed(() =>
  Math.max(1, ...sazonalidadePorMes.value.map(m => m.faturamento))
)
const maxQtd = computed(() =>
  Math.max(1, ...sazonalidadePorMes.value.map(m => m.qtd))
)

const chartBars = computed(() => {
  const meses = sazonalidadePorMes.value
  const band = chartPlot.value.w / meses.length
  const barWidth = band * 0.52
  const plotBottom = CHART.top + chartPlot.value.h
  return meses.map((m, i) => {
    const center = CHART.left + band * i + band / 2
    const barHeight = (m.faturamento / maxFaturamento.value) * chartPlot.value.h
    const qtyY = plotBottom - (m.qtd / maxQtd.value) * chartPlot.value.h
    return {
      ...m,
      index: i,
      center,
      band,
      barX: center - barWidth / 2,
      barWidth,
      barY: plotBottom - barHeight,
      barHeight,
      qtyY,
    }
  })
})

const chartQtdLine = computed(() =>
  chartBars.value.map(b => `${b.center.toFixed(1)},${b.qtyY.toFixed(1)}`).join(' ')
)

const chartGridLines = computed(() => {
  const steps = [0, 0.25, 0.5, 0.75, 1]
  const plotBottom = CHART.top + chartPlot.value.h
  return steps.map((frac) => ({
    y: plotBottom - frac * chartPlot.value.h,
    valor: maxFaturamento.value * frac,
  }))
})

const mediaLineY = computed(() => {
  const plotBottom = CHART.top + chartPlot.value.h
  return plotBottom - (sazonalidadeResumo.value.mediaMensal / maxFaturamento.value) * chartPlot.value.h
})

// Mês em destaque (hover) — inicia no mês de pico
const hoveredMes = ref<number | null>(null)
const mesAtivo = computed<MesSazonal>(() => {
  const meses = sazonalidadePorMes.value
  const target = hoveredMes.value ?? sazonalidadeResumo.value.pico?.mes
  return meses.find(m => m.mes === target) ?? meses[0] ?? emptyMes
})

const barTone = (mes: number, faturamento: number) => {
  if (mes === sazonalidadeResumo.value.pico?.mes) return 'fill-brand-500'
  if (faturamento >= sazonalidadeResumo.value.mediaMensal && faturamento > 0) return 'fill-indigo-400'
  return 'fill-slate-300 dark:fill-slate-700'
}

const formatCompactCurrency = (valor: number) => {
  if (valor >= 1000) return `R$ ${formatStockIntegrinNumber(valor / 1000, valor >= 10000 ? 0 : 1)}k`
  return formatStockIntegrinCurrency(valor)
}

// Seletor de ano da sazonalidade
const anosDisponiveis = computed(() => props.sazonalidade?.anos || [])

const periodoLabel = computed(() => {
  const anos = anosDisponiveis.value
  if (!anos.length) return ''
  const max = anos[0]?.ano
  const min = anos[anos.length - 1]?.ano
  return min === max ? `${min}` : `${min}–${max}`
})

const escopoLabel = computed(() => {
  if (anoSelecionado.value == null) {
    return periodoLabel.value ? `Todos os anos · ${periodoLabel.value}` : 'Todos os anos'
  }
  return `Ano de ${anoSelecionado.value}`
})

const selecionarAno = (valor: string) => {
  anoSelecionado.value = valor === 'todos' ? null : Number(valor)
  emit('loadSazonalidade', anoSelecionado.value ?? undefined)
}

// Quando os anos chegam pela primeira vez, assume o mais recente (em vez do
// consolidado ambíguo de todos os anos) e recarrega só aquele ano.
watch(anosDisponiveis, (anos) => {
  if (anoSelecionado.value === undefined && anos.length) {
    anoSelecionado.value = anos[0]?.ano ?? null
    emit('loadSazonalidade', anoSelecionado.value ?? undefined)
  }
}, { immediate: true })

onMounted(loadActive)
</script>

<template>
  <div class="space-y-4">    <!-- Sub-Abas -->
    <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 overflow-x-auto scrollbar-none whitespace-nowrap">
      <button
        v-for="tab in subTabs"
        :key="tab.id"
        type="button"
        class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition"
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
      <Loader2 class="h-4 w-4 animate-spin text-brand-500" /> Calculando...
    </div>

    <!-- ABA 1: RUPTURA -->
    <template v-else-if="activeSub === 'ruptura'">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Produtos em risco</p>
          <p class="mt-0.5 text-xl font-extrabold text-rose-600 dark:text-rose-400">
            {{ formatStockIntegrinNumber(props.ruptura?.resumo.total_risco || 0, 0) }}
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Custo p/ repor</p>
          <p class="mt-0.5 text-xl font-extrabold text-slate-800 dark:text-slate-200">
            {{ formatStockIntegrinCurrency(props.ruptura?.resumo.custo_total || 0) }}
          </p>
        </div>
        <div class="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Lead time / Cobertura</p>
          <p class="mt-0.5 text-xl font-extrabold text-slate-800 dark:text-slate-200">
            {{ props.ruptura?.parametros.lead_time_dias ?? 7 }}d <span class="text-xs font-bold text-slate-400 dark:text-slate-500">+ {{ props.ruptura?.parametros.coverage_days ?? 45 }}d</span>
          </p>
        </div>
      </div>

      <!-- Mobile view (Ruptura Cards) -->
      <div class="block lg:hidden space-y-3">
        <div
          v-for="row in props.ruptura?.rows || []"
          :key="`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`"
          class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/40 space-y-3 cursor-pointer hover:border-brand-500 transition-colors"
          @click="abrirDetalhe(row)"
        >
          <div class="flex justify-between gap-3">
            <div class="min-w-0">
              <h4 class="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-2">{{ row.descricao }}</h4>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">Empresa {{ row.idempresa }} · Cód. {{ row.idproduto }}/{{ row.idsubproduto }}</div>
            </div>
            <div class="shrink-0 text-right">
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Comprar</span>
              <span class="inline-block font-black text-brand-700 dark:text-brand-400 bg-brand-50 border border-brand-100 rounded px-1.5 py-0.5 mt-0.5 dark:bg-brand-500/10 dark:border-brand-500/25">{{ formatStockIntegrinNumber(row.sugestao_compra, 0) }} un</span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-950/40 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
            <div>
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Saldo</span>
              <span class="tabular-nums">{{ formatStockIntegrinNumber(row.saldo_disponivel, 0) }}</span>
            </div>
            <div>
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Giro / Dia</span>
              <span class="tabular-nums">{{ formatStockIntegrinNumber(row.giro_diario, 2) }}</span>
            </div>
            <div>
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Cobertura</span>
              <span class="tabular-nums font-bold" :class="(row.dias_cobertura ?? 999) <= row.lead_time_dias ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'">
                {{ row.dias_cobertura != null ? `${formatStockIntegrinNumber(row.dias_cobertura, 0)}d` : '—' }}
              </span>
            </div>
            <div>
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Ruptura</span>
              <span class="tabular-nums font-semibold">{{ row.data_ruptura || '—' }}</span>
            </div>
            <div class="col-span-2">
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Custo Reposição</span>
              <span class="tabular-nums font-bold text-slate-900 dark:text-slate-100">{{ formatStockIntegrinCurrency(row.custo_sugestao) }}</span>
            </div>
          </div>
        </div>
        <div v-if="!(props.ruptura?.rows || []).length" class="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">Nenhum produto em risco de ruptura.</div>
      </div>

      <!-- Desktop table (Ruptura) -->
      <div class="hidden lg:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
        <table class="w-full text-xs">
          <thead class="bg-slate-50/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-950/20 dark:text-slate-500 select-none">
            <tr>
              <th class="px-3 py-2 text-left">Produto</th>
              <th class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>Saldo</span>
                  <InfoTooltip title="Saldo Disponível" text="Estoque físico atual do item." align="center" />
                </div>
              </th>
              <th class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>Giro/dia</span>
                  <InfoTooltip title="Giro Diário" text="Unidades médias vendidas por dia." align="center" />
                </div>
              </th>
              <th class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>Cobertura</span>
                  <InfoTooltip title="Dias de Cobertura" text="Tempo estimado para o estoque físico atual durar." align="center" />
                </div>
              </th>
              <th class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>Ruptura em</span>
                  <InfoTooltip title="Data de Ruptura" text="Previsão de quando o estoque irá zerar." align="center" />
                </div>
              </th>
              <th class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>Comprar</span>
                  <InfoTooltip title="Sugestão de Compra" text="Quantidade a ser reposta para a cobertura escolhida." align="center" />
                </div>
              </th>
              <th class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>Custo</span>
                  <InfoTooltip title="Custo de Reposição" text="Capital estimado necessário para repor. Fórmula: Sugestão × Custo Unitário." align="right" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="row in props.ruptura?.rows || []" :key="`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`" class="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors cursor-pointer" @click="abrirDetalhe(row)">
              <td class="px-3 py-1.5">
                <div class="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{{ row.descricao || `Produto ${row.idproduto}/${row.idsubproduto}` }}</div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500">Empresa {{ row.idempresa }} · Cód. {{ row.idproduto }}/{{ row.idsubproduto }}</div>
              </td>
              <td class="px-3 py-1.5 text-right font-medium text-slate-700 dark:text-slate-300 tabular-nums">{{ formatStockIntegrinNumber(row.saldo_disponivel, 0) }}</td>
              <td class="px-3 py-1.5 text-right font-medium text-slate-700 dark:text-slate-300 tabular-nums">{{ formatStockIntegrinNumber(row.giro_diario, 2) }}</td>
              <td class="px-3 py-1.5 text-right font-semibold tabular-nums">
                <span :class="(row.dias_cobertura ?? 999) <= row.lead_time_dias ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'">
                  {{ row.dias_cobertura != null ? `${formatStockIntegrinNumber(row.dias_cobertura, 0)}d` : '—' }}
                </span>
              </td>
              <td class="px-3 py-1.5 text-right text-slate-600 dark:text-slate-300 tabular-nums">{{ row.data_ruptura || '—' }}</td>
              <td class="px-3 py-1.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">{{ formatStockIntegrinNumber(row.sugestao_compra, 0) }}</td>
              <td class="px-3 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{{ formatStockIntegrinCurrency(row.custo_sugestao) }}</td>
            </tr>
            <tr v-if="!(props.ruptura?.rows || []).length">
              <td colspan="7" class="px-3 py-8 text-center text-slate-400 dark:text-slate-500 font-medium">Nenhum produto em risco de ruptura para os parâmetros atuais.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ABA 2: CURVA ABC -->
    <template v-else-if="activeSub === 'abc'">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-emerald-200 bg-emerald-500/5 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Classe A (80%)</p>
            <p class="mt-0.5 text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{{ formatStockIntegrinNumber(props.abc?.resumo.classe_a || 0, 0) }}</p>
          </div>
          <div class="rounded-xl border border-amber-200 bg-amber-500/5 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Classe B (15%)</p>
            <p class="mt-0.5 text-lg font-extrabold text-amber-700 dark:text-amber-300">{{ formatStockIntegrinNumber(props.abc?.resumo.classe_b || 0, 0) }}</p>
          </div>
          <div class="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 bg-slate-500/5 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Classe C (5%)</p>
            <p class="mt-0.5 text-lg font-extrabold text-slate-600 dark:text-slate-300">{{ formatStockIntegrinNumber(props.abc?.resumo.classe_c || 0, 0) }}</p>
          </div>
        </div>
        
        <div class="flex flex-col gap-1 w-full sm:w-44 shrink-0">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Classificar por</span>
          <SelectInput :model-value="abcMetric" size="sm" class="h-8.5 text-xs" @update:model-value="changeMetric($event as IntegrimAbcMetric)">
            <option v-for="opt in metricOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </SelectInput>
        </div>
      </div>

      <!-- Mobile view (ABC Cards) -->
      <div class="block lg:hidden space-y-3">
        <div
          v-for="(row, idx) in props.abc?.rows || []"
          :key="`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`"
          class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/40 space-y-3 cursor-pointer hover:border-brand-500 transition-colors"
          @click="abrirDetalhe(row)"
        >
          <div class="flex justify-between gap-3">
            <div class="min-w-0">
              <h4 class="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-2">
                {{ idx + 1 }}. {{ row.descricao || `Produto ${row.idproduto}` }}
              </h4>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">Empresa {{ row.idempresa }} · Cód. {{ row.idproduto }}/{{ row.idsubproduto }}</div>
            </div>
            <div class="shrink-0 text-center">
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Classe</span>
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold mt-0.5" :class="classeTone[row.classe]">{{ row.classe }}</span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-950/40 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
            <div>
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Valor</span>
              <span class="tabular-nums font-bold text-slate-900 dark:text-slate-100">{{ metricValue(row.valor) }}</span>
            </div>
            <div>
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Partic.</span>
              <span class="tabular-nums">{{ formatStockIntegrinNumber(row.participacao, 1) }}%</span>
            </div>
            <div>
              <span class="block text-[8px] font-bold text-slate-400 uppercase">Acumul.</span>
              <span class="tabular-nums text-slate-500">{{ formatStockIntegrinNumber(row.acumulado, 1) }}%</span>
            </div>
          </div>
        </div>
        <div v-if="!(props.abc?.rows || []).length" class="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">Sem dados para classificar no período.</div>
      </div>

      <!-- Desktop table (ABC) -->
      <div class="hidden lg:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
        <table class="w-full text-xs">
          <thead class="bg-slate-50/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-950/20 dark:text-slate-500 select-none">
            <tr>
              <th class="px-3 py-2 text-left w-12">#</th>
              <th class="px-3 py-2 text-left">Produto</th>
              <th class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>Valor</span>
                  <InfoTooltip title="Valor no Período" text="Soma total do indicador no intervalo de análise (lucro, faturamento ou quantidade)." align="center" />
                </div>
              </th>
              <th class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>Participação</span>
                  <InfoTooltip title="Participação no Total" text="Percentual que este produto representa do total geral." align="center" />
                </div>
              </th>
              <th class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-1">
                  <span>Acumulado</span>
                  <InfoTooltip title="Participação Acumulada" text="Porcentagem acumulada acumulando a participação deste item e dos anteriores." align="center" />
                </div>
              </th>
              <th class="px-3 py-2 text-center w-20">Classe</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="(row, idx) in props.abc?.rows || []" :key="`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`" class="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors cursor-pointer" @click="abrirDetalhe(row)">
              <td class="px-3 py-1.5 text-slate-400 dark:text-slate-500 tabular-nums">{{ idx + 1 }}</td>
              <td class="px-3 py-1.5">
                <div class="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{{ row.descricao || `Produto ${row.idproduto}/${row.idsubproduto}` }}</div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500">Empresa {{ row.idempresa }} · Cód. {{ row.idproduto }}/{{ row.idsubproduto }}</div>
              </td>
              <td class="px-3 py-1.5 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">{{ metricValue(row.valor) }}</td>
              <td class="px-3 py-1.5 text-right text-slate-600 dark:text-slate-300 tabular-nums">{{ formatStockIntegrinNumber(row.participacao, 1) }}%</td>
              <td class="px-3 py-1.5 text-right text-slate-600 dark:text-slate-300 tabular-nums">{{ formatStockIntegrinNumber(row.acumulado, 1) }}%</td>
              <td class="px-3 py-1.5 text-center">
                <span class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-extrabold" :class="classeTone[row.classe]">{{ row.classe }}</span>
              </td>
            </tr>
            <tr v-if="!(props.abc?.rows || []).length">
              <td colspan="6" class="px-3 py-8 text-center text-slate-400 dark:text-slate-500 font-medium">Sem dados para classificar no período.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ABA 3: SAZONALIDADE -->
    <template v-else>
      <div
        v-if="props.sazonalidade?.requer_backfill"
        class="rounded-xl border border-amber-200 bg-amber-500/5 p-4 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
      >
        A Sazonalidade precisa do histórico diário de vendas (tabela de vendas por dia), que ainda está vazia.
        Rode a sincronização das notas para habilitar a curva por mês do ano.
      </div>
      <template v-else>
        <!-- Cabeçalho: escopo temporal + seletor de ano -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200">Mostrando: {{ escopoLabel }}</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500">
              Cada mês consolida as vendas daquele mês {{ anoSelecionado == null ? 'em todos os anos do histórico' : `de ${anoSelecionado}` }}.
            </p>
          </div>
          <div class="flex flex-col gap-1 w-full sm:w-44 shrink-0">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ano</span>
            <SelectInput
              :model-value="anoSelecionado == null ? 'todos' : String(anoSelecionado)"
              size="sm"
              class="h-8.5 text-xs"
              @update:model-value="selecionarAno($event as string)"
            >
              <option v-for="a in anosDisponiveis" :key="a.ano" :value="String(a.ano)">{{ a.ano }}</option>
              <option value="todos">Todos os anos</option>
            </SelectInput>
          </div>
        </div>

        <!-- Cartões de resumo da curva sazonal -->
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div class="rounded-xl border border-brand-200 bg-brand-500/5 p-3 dark:border-brand-500/25 dark:bg-brand-500/10">
            <p class="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Mês de pico</p>
            <p class="mt-0.5 text-lg font-extrabold text-brand-700 dark:text-brand-300">{{ sazonalidadeResumo.pico?.label || '—' }}</p>
            <p class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{{ formatStockIntegrinCurrency(sazonalidadeResumo.pico?.faturamento || 0) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Média mensal</p>
            <p class="mt-0.5 text-lg font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">{{ formatStockIntegrinCurrency(sazonalidadeResumo.mediaMensal) }}</p>
            <p class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{{ sazonalidadeResumo.mesesComVenda }} {{ sazonalidadeResumo.mesesComVenda === 1 ? 'mês com venda' : 'meses com venda' }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Mês mais fraco</p>
            <p class="mt-0.5 text-lg font-extrabold text-slate-800 dark:text-slate-200">{{ sazonalidadeResumo.vale?.label || '—' }}</p>
            <p class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">{{ sazonalidadeResumo.vale ? formatStockIntegrinCurrency(sazonalidadeResumo.vale.faturamento) : '—' }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ anoSelecionado == null ? 'Total no período' : `Total em ${anoSelecionado}` }}</p>
            <p class="mt-0.5 text-lg font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">{{ formatStockIntegrinCurrency(sazonalidadeResumo.totalFaturamento) }}</p>
            <p class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">{{ formatStockIntegrinNumber(sazonalidadeResumo.totalNotas, 0) }} notas</p>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900/40 shadow-xs">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CalendarRange class="h-4.5 w-4.5 text-brand-500" />
              Curva de sazonalidade · {{ escopoLabel }}
            </p>
            <!-- Legenda -->
            <div class="flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-brand-500" /> Faturamento</span>
              <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-3 rounded-sm" style="background:repeating-linear-gradient(90deg,#10b981 0 4px,transparent 4px 7px)" /> Quantidade</span>
              <span class="flex items-center gap-1"><span class="inline-block h-0 w-3 border-t-2 border-dashed border-slate-400" /> Média</span>
            </div>
          </div>

          <!-- Readout do mês ativo (hover) -->
          <div class="mb-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-950/40 sm:grid-cols-4">
            <div>
              <span class="block text-[8px] font-bold uppercase tracking-wide text-slate-400">Mês</span>
              <span class="text-sm font-extrabold text-slate-900 dark:text-slate-100">{{ mesAtivo.label }}</span>
            </div>
            <div>
              <span class="block text-[8px] font-bold uppercase tracking-wide text-slate-400">Faturamento</span>
              <span class="text-sm font-bold text-brand-700 dark:text-brand-400 tabular-nums">{{ formatStockIntegrinCurrency(mesAtivo.faturamento) }}</span>
              <span class="ml-1 text-[10px] font-bold text-slate-400 tabular-nums">{{ formatStockIntegrinNumber(mesAtivo.share, 1) }}%</span>
            </div>
            <div>
              <span class="block text-[8px] font-bold uppercase tracking-wide text-slate-400">Quantidade</span>
              <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{{ formatStockIntegrinNumber(mesAtivo.qtd, 0) }} un</span>
            </div>
            <div>
              <span class="block text-[8px] font-bold uppercase tracking-wide text-slate-400">Notas</span>
              <span class="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">{{ formatStockIntegrinNumber(mesAtivo.numNotas, 0) }}</span>
            </div>
          </div>

          <!-- Gráfico combinado SVG -->
          <svg
            :viewBox="`0 0 ${CHART.w} ${CHART.h}`"
            class="w-full"
            role="img"
            aria-label="Gráfico de faturamento e quantidade por mês do ano"
            @mouseleave="hoveredMes = null"
          >
            <!-- Linhas de grade + rótulos do eixo Y (faturamento) -->
            <g>
              <line
                v-for="(g, i) in chartGridLines"
                :key="`grid-${i}`"
                :x1="CHART.left" :x2="CHART.w - CHART.right"
                :y1="g.y" :y2="g.y"
                class="stroke-slate-100 dark:stroke-slate-800"
                stroke-width="1"
              />
              <text
                v-for="(g, i) in chartGridLines"
                :key="`gridlbl-${i}`"
                :x="CHART.left - 8" :y="g.y + 3"
                text-anchor="end"
                class="fill-slate-400 dark:fill-slate-500"
                style="font-size: 10px; font-weight: 700"
              >{{ formatCompactCurrency(g.valor) }}</text>
            </g>

            <!-- Linha de média -->
            <line
              :x1="CHART.left" :x2="CHART.w - CHART.right"
              :y1="mediaLineY" :y2="mediaLineY"
              class="stroke-slate-400 dark:stroke-slate-500"
              stroke-width="1.5" stroke-dasharray="5 4"
            />

            <!-- Barras de faturamento -->
            <g>
              <rect
                v-for="b in chartBars"
                :key="`bar-${b.mes}`"
                :x="b.barX" :y="b.barY"
                :width="b.barWidth" :height="b.barHeight"
                rx="3"
                :class="[barTone(b.mes, b.faturamento), hoveredMes === b.mes ? 'opacity-100' : 'opacity-90']"
                class="transition-opacity"
              />
            </g>

            <!-- Linha de quantidade -->
            <polyline
              :points="chartQtdLine"
              fill="none"
              class="stroke-emerald-500"
              stroke-width="2"
              stroke-dasharray="4 3"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            <circle
              v-for="b in chartBars"
              :key="`qty-${b.mes}`"
              :cx="b.center" :cy="b.qtyY"
              :r="hoveredMes === b.mes ? 4 : 2.5"
              class="fill-emerald-500 stroke-white dark:stroke-slate-900 transition-all"
              stroke-width="1.5"
            />

            <!-- Rótulos do eixo X (meses) -->
            <text
              v-for="b in chartBars"
              :key="`xlbl-${b.mes}`"
              :x="b.center" :y="CHART.h - 14"
              text-anchor="middle"
              :class="hoveredMes === b.mes || b.mes === sazonalidadeResumo.pico?.mes ? 'fill-slate-700 dark:fill-slate-200' : 'fill-slate-400 dark:fill-slate-500'"
              style="font-size: 11px; font-weight: 700"
            >{{ b.label }}</text>

            <!-- Áreas de captura de hover -->
            <rect
              v-for="b in chartBars"
              :key="`hit-${b.mes}`"
              :x="b.center - b.band / 2" :y="CHART.top"
              :width="b.band" :height="chartPlot.h"
              fill="transparent"
              class="cursor-pointer"
              @mouseenter="hoveredMes = b.mes"
            />
          </svg>
        </div>
      </template>
    </template>
  </div>
</template>
