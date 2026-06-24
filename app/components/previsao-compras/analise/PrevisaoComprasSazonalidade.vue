<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CalendarRange } from 'lucide-vue-next'
import type {
  IntegrimSazonalidadeResponse,
  IntegrimSazonalidadeRow,
} from '../../../../shared/types/IntegrimNotas'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../../utils/stock-integrin-format'
import SelectInput from '../../SelectInput.vue'
import InfoTooltip from '../../InfoTooltip.vue'
import PcCard from '../ui/PcCard.vue'
import PcStatTile from '../ui/PcStatTile.vue'

const props = withDefaults(defineProps<{
  sazonalidade: IntegrimSazonalidadeResponse | null
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'load', payload: { ano?: number | null; mesInicio?: number }): void
}>()

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// undefined = ainda não inicializado (assume ano mais recente quando os dados chegam)
// null = "Todos os anos" (consolidado)
const anoSelecionado = ref<number | null | undefined>(undefined)
const mesInicio = ref(1) // Janeiro (1) a Dezembro (12)

type MesSazonal = {
  mes: number
  label: string
  faturamento: number
  qtd: number
  numNotas: number
  share: number
}
const emptyMes: MesSazonal = { mes: 1, label: 'Jan', faturamento: 0, qtd: 0, numNotas: 0, share: 0 }

const sazonalidadePorMes = computed<MesSazonal[]>(() => {
  const map = new Map<number, IntegrimSazonalidadeRow>(
    (props.sazonalidade?.rows || []).map(r => [r.mes, r]),
  )
  const lista: MesSazonal[] = []
  for (let i = 0; i < 12; i++) {
    const mesNum = ((mesInicio.value - 1 + i) % 12) + 1
    const label = monthLabels[mesNum - 1] || ''
    const row = map.get(mesNum)
    lista.push({
      mes: mesNum,
      label,
      faturamento: row?.faturamento || 0,
      qtd: row?.qtd || 0,
      numNotas: row?.num_notas || 0,
      share: row?.faturamento_share || 0,
    })
  }
  return lista
})

const resumo = computed(() => {
  const meses = sazonalidadePorMes.value
  const comVenda = meses.filter(m => m.faturamento > 0)
  const totalFaturamento = meses.reduce((acc, m) => acc + m.faturamento, 0)
  const totalNotas = meses.reduce((acc, m) => acc + m.numNotas, 0)
  const mediaMensal = comVenda.length ? totalFaturamento / comVenda.length : 0

  let pico = meses[0] ?? emptyMes
  let vale = comVenda[0] ?? meses[0] ?? emptyMes
  for (const m of meses) if (m.faturamento > pico.faturamento) pico = m
  for (const m of comVenda) if (m.faturamento < vale.faturamento) vale = m

  return {
    totalFaturamento,
    totalNotas,
    mediaMensal,
    pico,
    vale: comVenda.length ? vale : null,
    mesesComVenda: comVenda.length,
  }
})

// Geometria do gráfico combinado (proporções normais com suporte a esticamento responsivo)
const CHART = { w: 720, h: 180, top: 15, right: 30, bottom: 25, left: 50 }
const chartPlot = computed(() => ({ w: CHART.w - CHART.left - CHART.right, h: CHART.h - CHART.top - CHART.bottom }))
const maxFaturamento = computed(() => Math.max(1, ...sazonalidadePorMes.value.map(m => m.faturamento)))
const maxQtd = computed(() => Math.max(1, ...sazonalidadePorMes.value.map(m => m.qtd)))

const chartBars = computed(() => {
  const meses = sazonalidadePorMes.value
  const band = chartPlot.value.w / meses.length
  const barWidth = band * 0.42 // Velas proporcionais, sem espaçamento excessivo
  const plotBottom = CHART.top + chartPlot.value.h
  return meses.map((m, i) => {
    const center = CHART.left + band * i + band / 2
    const barHeight = (m.faturamento / maxFaturamento.value) * chartPlot.value.h
    const qtyY = plotBottom - (m.qtd / maxQtd.value) * chartPlot.value.h
    return { ...m, center, band, barX: center - barWidth / 2, barXCenter: center, barWidth, barY: plotBottom - barHeight, barHeight, qtyY }
  })
})

const chartQtdLine = computed(() => chartBars.value.map(b => `${b.center.toFixed(1)},${b.qtyY.toFixed(1)}`).join(' '))

const chartGridLines = computed(() => {
  const plotBottom = CHART.top + chartPlot.value.h
  return [0, 0.25, 0.5, 0.75, 1].map(frac => ({ y: plotBottom - frac * chartPlot.value.h, valor: maxFaturamento.value * frac }))
})

const mediaLineY = computed(() => {
  const plotBottom = CHART.top + chartPlot.value.h
  return plotBottom - (resumo.value.mediaMensal / maxFaturamento.value) * chartPlot.value.h
})

const hoveredMes = ref<number | null>(null)
const mesAtivo = computed<MesSazonal>(() => {
  const target = hoveredMes.value ?? resumo.value.pico?.mes
  return sazonalidadePorMes.value.find(m => m.mes === target) ?? sazonalidadePorMes.value[0] ?? emptyMes
})

const barTone = (mes: number, faturamento: number) => {
  if (mes === resumo.value.pico?.mes) return 'fill-brand-500'
  if (faturamento >= resumo.value.mediaMensal && faturamento > 0) return 'fill-indigo-400/80 dark:fill-indigo-500/50'
  return 'fill-slate-200 dark:fill-slate-800'
}

const formatCompactCurrency = (valor: number) => {
  if (valor >= 1000) return `R$ ${formatStockIntegrinNumber(valor / 1000, valor >= 10000 ? 0 : 1)}k`
  return formatStockIntegrinCurrency(valor)
}

const anosDisponiveis = computed(() => props.sazonalidade?.anos || [])
const periodoLabel = computed(() => {
  const anos = anosDisponiveis.value
  if (!anos.length) return ''
  const max = anos[0]?.ano
  const min = anos[anos.length - 1]?.ano
  return min === max ? `${min}` : `${min}–${max}`
})
const escopoLabel = computed(() => {
  if (anoSelecionado.value == null) return periodoLabel.value ? `Todos os anos · ${periodoLabel.value}` : 'Todos os anos'
  return `Ano de ${anoSelecionado.value}`
})

const selecionarAno = (valor: string) => {
  anoSelecionado.value = valor === 'todos' ? null : Number(valor)
  emit('load', { ano: anoSelecionado.value ?? undefined, mesInicio: mesInicio.value })
}

watch(mesInicio, (novoMes) => {
  emit('load', { ano: anoSelecionado.value ?? undefined, mesInicio: novoMes })
})

watch(anosDisponiveis, (anos) => {
  if (anoSelecionado.value === undefined && anos.length) {
    anoSelecionado.value = anos[0]?.ano ?? null
    emit('load', { ano: anoSelecionado.value ?? undefined, mesInicio: mesInicio.value })
  }
}, { immediate: true })

onMounted(() => emit('load', { ano: anoSelecionado.value ?? undefined, mesInicio: mesInicio.value }))
</script>

<template>
  <PcCard>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <p class="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <CalendarRange class="h-4 w-4 text-brand-500" />
          Sazonalidade — quando cada mês vende mais
          <InfoTooltip align="left" text="Análise mensal de saídas. Ajuda você a ver os meses de maior venda deste produto para planejar compras maiores com antecedência e evitar faltas no pico." />
        </p>
        <p class="text-[11px] text-slate-400 dark:text-slate-500">
          Mostra em que meses do ano as vendas sobem ou caem. Útil para se antecipar e comprar antes dos picos.
          Mostrando: {{ escopoLabel }}.
        </p>
      </div>
      <div class="flex gap-2 w-full sm:w-auto shrink-0">
        <!-- Iniciar em -->
        <div class="flex flex-col gap-1 w-1/2 sm:w-32">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-450">Iniciar Em</span>
          <SelectInput
            :model-value="String(mesInicio)"
            size="sm"
            class="h-8.5 text-xs"
            @update:model-value="mesInicio = Number($event)"
          >
            <option v-for="(m, idx) in monthLabels" :key="idx" :value="String(idx + 1)">{{ m }}</option>
          </SelectInput>
        </div>
        <!-- Ano -->
        <div class="flex flex-col gap-1 w-1/2 sm:w-32">
          <span class="text-[10px] font-bold uppercase tracking-wide text-slate-450">Ano</span>
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
    </div>

    <div v-if="props.loading" class="flex items-center justify-center py-12 text-sm text-slate-400">Calculando…</div>

    <div v-else-if="props.sazonalidade?.requer_backfill" class="mt-3 rounded-lg border border-amber-200 bg-amber-500/5 p-3 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      Ainda não há histórico diário de vendas suficiente. Rode a sincronização das notas para habilitar a curva por mês.
    </div>

    <template v-else>
      <!-- Resumo de Indicadores -->
      <div class="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PcStatTile label="Mês de pico" :value="resumo.pico?.label || '—'" tone="brand" :hint="formatStockIntegrinCurrency(resumo.pico?.faturamento || 0)" />
        <PcStatTile label="Média mensal" :value="formatStockIntegrinCurrency(resumo.mediaMensal)" :hint="`${resumo.mesesComVenda} ${resumo.mesesComVenda === 1 ? 'mês com venda' : 'meses com venda'}`" />
        <PcStatTile label="Mês mais fraco" :value="resumo.vale?.label || '—'" :hint="resumo.vale ? formatStockIntegrinCurrency(resumo.vale.faturamento) : '—'" />
        <PcStatTile :label="anoSelecionado == null ? 'Total no período' : `Total em ${anoSelecionado}`" :value="formatStockIntegrinCurrency(resumo.totalFaturamento)" :hint="`${formatStockIntegrinNumber(resumo.totalNotas, 0)} notas`" />
      </div>

      <!-- Barra de Detalhe do Mês Ativo + Legenda Unificada -->
      <div class="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-100 dark:border-slate-800/80 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/25 text-xs">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-extrabold text-slate-800 dark:text-slate-150 uppercase tracking-wider bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] select-none">
            {{ mesAtivo.label }}
          </span>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span class="tabular-nums flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Venda: <strong class="text-slate-800 dark:text-slate-200 font-bold">{{ formatStockIntegrinCurrency(mesAtivo.faturamento) }}</strong>
            </span>
            <span class="hidden sm:inline border-l border-slate-200 dark:border-slate-800 h-2.5" />
            <span class="tabular-nums flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Qtd: <strong class="text-slate-800 dark:text-slate-200 font-bold">{{ formatStockIntegrinNumber(mesAtivo.qtd, 0) }} un</strong>
            </span>
            <span class="hidden sm:inline border-l border-slate-200 dark:border-slate-800 h-2.5" />
            <span class="tabular-nums text-slate-405 dark:text-slate-505">
              Notas: <strong class="text-slate-700 dark:text-slate-350 font-bold">{{ formatStockIntegrinNumber(mesAtivo.numNotas, 0) }} saídas</strong>
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-[9px] font-bold text-slate-450 dark:text-slate-550">
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded bg-brand-500" /> Faturamento</span>
          <span class="flex items-center gap-1"><span class="inline-block h-0.5 w-2 bg-emerald-500" /> Quantidade</span>
          <span class="flex items-center gap-1"><span class="inline-block h-0 w-2 border-t border-dashed border-slate-450 dark:border-slate-650" /> Média</span>
        </div>
      </div>

      <!-- Gráfico Combinado Responsivo com Scroll Horizontal no Mobile -->
      <div class="mt-3 w-full overflow-x-auto pb-2 scrollbar-thin">
        <svg :viewBox="`0 0 ${CHART.w} ${CHART.h}`" class="w-full min-w-[720px] select-none" role="img" aria-label="Faturamento e quantidade por mês" @mouseleave="hoveredMes = null">
          <!-- Linhas de Grade de Faturamento -->
          <g>
            <line v-for="(g, i) in chartGridLines" :key="`grid-${i}`" :x1="CHART.left" :x2="CHART.w - CHART.right" :y1="g.y" :y2="g.y" class="stroke-slate-100 dark:stroke-slate-800/80" stroke-width="0.75" />
            <text v-for="(g, i) in chartGridLines" :key="`gl-${i}`" :x="CHART.left - 8" :y="g.y + 3" text-anchor="end" class="fill-slate-400 dark:fill-slate-550 font-medium" style="font-size: 9px">{{ formatCompactCurrency(g.valor) }}</text>
          </g>
          
          <!-- Linha da Média Mensal -->
          <line :x1="CHART.left" :x2="CHART.w - CHART.right" :y1="mediaLineY" :y2="mediaLineY" class="stroke-slate-400/80 dark:stroke-slate-650" stroke-width="1.25" stroke-dasharray="4 3" />
          
          <!-- Barras de Faturamento -->
          <g>
            <rect v-for="b in chartBars" :key="`bar-${b.mes}`" :x="b.barX" :y="b.barY" :width="b.barWidth" :height="b.barHeight" rx="3" :class="[barTone(b.mes, b.faturamento), hoveredMes === b.mes ? 'opacity-100 brightness-95' : 'opacity-90']" class="transition-all duration-150" />
          </g>
          
          <!-- Linha de Tendência de Quantidade -->
          <polyline :points="chartQtdLine" fill="none" class="stroke-emerald-500" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
          
          <!-- Nós de Quantidade (Círculos) -->
          <circle v-for="b in chartBars" :key="`q-${b.mes}`" :cx="b.center" :cy="b.qtyY" :r="hoveredMes === b.mes ? 4 : 2.5" class="fill-emerald-500 stroke-white dark:stroke-slate-900 transition-all duration-150" stroke-width="1.25" />
          
          <!-- Eixo X (Rótulos dos Meses) -->
          <text v-for="b in chartBars" :key="`x-${b.mes}`" :x="b.center" :y="CHART.h - 8" text-anchor="middle" :class="hoveredMes === b.mes || b.mes === resumo.pico?.mes ? 'fill-slate-800 dark:fill-slate-200 font-bold' : 'fill-slate-400 dark:fill-slate-500 font-medium'" style="font-size: 9px">{{ b.label }}</text>
          
          <!-- Área de Interação (Hit Area) para Hover Fácil -->
          <rect v-for="b in chartBars" :key="`hit-${b.mes}`" :x="b.center - b.band / 2" :y="CHART.top" :width="b.band" :height="chartPlot.h" fill="transparent" class="cursor-pointer" @mouseenter="hoveredMes = b.mes" />
        </svg>
      </div>
    </template>
  </PcCard>
</template>

