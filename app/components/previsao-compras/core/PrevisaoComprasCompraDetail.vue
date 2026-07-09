<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  Layers,
  TrendingUp,
  Clock,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  Sparkles,
  Printer,
} from 'lucide-vue-next'
import type {
  IntegrimCompraAiOportunidade,
  IntegrimCompraOportunidadeStatus,
  IntegrimListaCompraRow,
} from '../../../../shared/types/IntegrimNotas'
import ModalGlobal from '../../ModalGlobal.vue'
import InfoTooltip from '../../InfoTooltip.vue'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../../utils/stock-integrin-format'

const props = defineProps<{
  modelValue: boolean
  row: IntegrimListaCompraRow | null
  oportunidades: IntegrimCompraAiOportunidade[]
  printing?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'opportunityAction', value: {
    id: string
    status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>
  }): void
  (e: 'print', row: IntegrimListaCompraRow): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

// Janela de análise usada pela RPC (p_horizon_days). Esta tela não expõe o
// parâmetro, então a demanda é sempre calculada sobre os últimos 90 dias.
const HORIZONTE_DIAS = 90

const un = (value: number | null | undefined, decimals = 0) =>
  value == null ? '—' : formatStockIntegrinNumber(value, decimals)

const fmtData = (value: string | null) => {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('pt-BR')
}

const periodoResumo = computed(() => {
  const row = props.row
  if (!row) return ''
  const parts = [`Análise dos últimos ${HORIZONTE_DIAS} dias`]
  if (row.dias_com_venda) parts.push(`vendeu em ${un(row.dias_com_venda)} desses dias`)
  const ultima = fmtData(row.ultima_venda)
  if (ultima) parts.push(`última venda em ${ultima}`)
  return parts.join(' · ')
})

const rupturaCurta = computed(() => {
  const dias = props.row?.dias_ate_ruptura
  if (dias == null) return '—'
  if (dias <= 0) return '0d'
  return `${formatStockIntegrinNumber(dias, 1)}d`
})

type Align = 'left' | 'center' | 'right'
type Tile = {
  key: string
  icon: Component
  label: string
  value: string
  sub: string | null
  tip: string
  align: Align
  tone: 'default' | 'accent' | 'danger'
  small: boolean
}

const tiles = computed<Tile[]>(() => {
  const row = props.row
  if (!row) return []
  const rupturaCritica = row.dias_ate_ruptura != null && row.dias_ate_ruptura <= 2
  return [
    {
      key: 'saldo',
      icon: Layers,
      label: 'Saldo atual',
      value: `${un(row.saldo_disponivel)} un`,
      sub: row.custo_unit ? `custo ${formatStockIntegrinCurrency(row.custo_unit)}` : null,
      tip: 'Quantidade física atual em estoque disponível para venda.',
      align: 'left',
      tone: 'default',
      small: false,
    },
    {
      key: 'demanda',
      icon: TrendingUp,
      label: 'Demanda/dia',
      value: `${un(row.demanda_diaria, 1)} un`,
      sub: 'média de venda',
      tip: `Média de unidades vendidas por dia nos últimos ${HORIZONTE_DIAS} dias — inclui os dias sem venda no cálculo.`,
      align: 'center',
      tone: 'default',
      small: false,
    },
    {
      key: 'ruptura',
      icon: Clock,
      label: 'Ruptura',
      value: rupturaCurta.value,
      sub: rupturaCritica ? 'crítico' : 'até zerar',
      tip: 'Quantos dias o estoque atual aguenta antes de zerar (saldo ÷ demanda por dia).',
      align: 'right',
      tone: rupturaCritica ? 'danger' : 'default',
      small: false,
    },
    {
      key: 'comprar',
      icon: ShoppingCart,
      label: 'Comprar',
      value: `${un(row.sugestao_compra)} un`,
      sub: row.sugestao_compra > 0 ? `cobre ~${un(row.coverage_days)} dias` : 'sem compra',
      tip: 'Quantidade sugerida para cobrir o lead time do fornecedor mais os dias de cobertura, descontando o saldo atual.',
      align: 'left',
      tone: 'accent',
      small: false,
    },
    {
      key: 'capital',
      icon: Wallet,
      label: 'Capital',
      value: formatStockIntegrinCurrency(row.capital_necessario),
      sub: 'investimento',
      tip: 'Investimento necessário para comprar a quantidade sugerida (sugestão × custo unitário).',
      align: 'center',
      tone: 'default',
      small: true,
    },
    {
      key: 'risco',
      icon: AlertTriangle,
      label: 'Risco',
      value: formatStockIntegrinCurrency(row.dinheiro_em_risco),
      sub: 'margem perdida',
      tip: 'Margem de lucro estimada que se perde se o produto faltar antes de a reposição chegar.',
      align: 'right',
      tone: 'danger',
      small: true,
    },
  ]
})

// Decisão em linguagem simples, montada a partir dos números da linha.
const decisao = computed(() => {
  const row = props.row
  if (!row) return null

  const saldo = formatStockIntegrinNumber(row.saldo_disponivel, 0)
  const demanda = formatStockIntegrinNumber(row.demanda_diaria, 1)
  const ponto = formatStockIntegrinNumber(row.ponto_reposicao, 0)
  const sugestao = formatStockIntegrinNumber(row.sugestao_compra, 0)
  const cobertura = formatStockIntegrinNumber(row.coverage_days, 0)
  const zerado = row.saldo_disponivel <= 0 || (row.dias_ate_ruptura != null && row.dias_ate_ruptura <= 0)

  if (row.sugestao_compra > 0) {
    if (zerado) {
      return {
        tom: 'danger' as const,
        titulo: 'Comprar com urgência',
        texto: `Está sem estoque e vende ~${demanda}/dia — já está perdendo venda. `
          + `O ponto de reposição é ${ponto} un. Compre ${sugestao} un para cobrir ~${cobertura} dias `
          + `e recuperar o estoque de segurança.`,
      }
    }
    const critico = row.dias_ate_ruptura != null && row.dias_ate_ruptura <= 2
    return {
      tom: critico ? ('danger' as const) : ('warning' as const),
      titulo: critico ? 'Comprar com urgência' : 'Precisa repor',
      texto: `Tem ${saldo} un e vende ~${demanda}/dia, o que dura ~${rupturaCurta.value.replace('d', ' dias')}. `
        + `O ponto de reposição é ${ponto} un e o estoque já está abaixo dele. `
        + `Compre ${sugestao} un para cobrir ~${cobertura} dias de venda.`,
    }
  }

  return {
    tom: 'success' as const,
    titulo: 'Estoque saudável',
    texto: `Tem ${saldo} un cobrindo ~${rupturaCurta.value.replace('d', ' dias')}, acima do ponto de reposição (${ponto} un). `
      + `Nenhuma compra necessária agora.`,
  }
})

const opAtivas = computed(() =>
  props.oportunidades.filter(op => op.status !== 'expirada' && op.status !== 'ignorada'),
)
const opInativas = computed(() =>
  props.oportunidades.filter(op => op.status === 'expirada' || op.status === 'ignorada'),
)

const statusLabel: Record<IntegrimCompraOportunidadeStatus, string> = {
  nova: 'Nova',
  aceita: 'Aceita',
  comprada: 'Comprada',
  ignorada: 'Ignorada',
  expirada: 'Expirada',
}

const onAction = (
  id: string,
  status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>,
) => emit('opportunityAction', { id, status })
</script>

<template>
  <ModalGlobal
    v-model="isOpen"
    :title="props.row?.descricao || 'Detalhes do produto'"
    :description="props.row ? `Empresa ${props.row.idempresa} · Código ${props.row.idproduto}/${props.row.idsubproduto}` : ''"
    max-width-class="max-w-2xl"
    content-class="p-0"
  >
    <div v-if="props.row" class="space-y-5 p-5 md:p-6">
      <!-- Situação -->
      <div v-if="decisao" class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset"
          :class="[
            decisao.tom === 'danger' ? 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-500/30' :
            decisao.tom === 'warning' ? 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-500/30' :
            'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-500/30',
          ]"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="[
              decisao.tom === 'danger' ? 'bg-rose-500 animate-pulse' :
              decisao.tom === 'warning' ? 'bg-amber-500' : 'bg-emerald-500',
            ]"
          />
          {{ decisao.titulo }}
        </span>
      </div>

      <!-- KPIs essenciais -->
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <div
          v-for="tile in tiles"
          :key="tile.key"
          class="rounded-xl border p-3.5 transition-colors"
          :class="[
            tile.tone === 'accent' ? 'border-brand-200 bg-brand-50/60 dark:border-brand-500/25 dark:bg-brand-500/10' :
            tile.tone === 'danger' ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900/25 dark:bg-rose-950/10' :
            'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40',
          ]"
        >
          <div class="flex items-center justify-between gap-1">
            <span
              class="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider"
              :class="[
                tile.tone === 'accent' ? 'text-brand-600 dark:text-brand-300' :
                tile.tone === 'danger' ? 'text-rose-500 dark:text-rose-400' :
                'text-slate-400 dark:text-slate-500',
              ]"
            >
              <component :is="tile.icon" class="h-3 w-3" />
              {{ tile.label }}
            </span>
            <InfoTooltip :title="tile.label" :text="tile.tip" :align="tile.align" />
          </div>
          <div
            class="mt-1.5 font-black tabular-nums"
            :class="[
              tile.small ? 'text-sm' : 'text-xl',
              tile.tone === 'accent' ? 'text-brand-700 dark:text-brand-300' :
              tile.tone === 'danger' ? 'text-rose-700 dark:text-rose-300' :
              'text-slate-900 dark:text-slate-100',
            ]"
          >
            {{ tile.value }}
          </div>
          <div v-if="tile.sub" class="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {{ tile.sub }}
          </div>
        </div>
      </div>

      <!-- Por que comprar -->
      <section v-if="decisao" class="rounded-xl border p-4"
        :class="[
          decisao.tom === 'danger' ? 'border-rose-200/70 bg-rose-50/30 dark:border-rose-900/30 dark:bg-rose-950/10' :
          decisao.tom === 'warning' ? 'border-amber-200/70 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10' :
          'border-emerald-200/70 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/10',
        ]"
      >
        <h4 class="text-xs font-bold uppercase tracking-wider mb-1.5"
          :class="[
            decisao.tom === 'danger' ? 'text-rose-700 dark:text-rose-400' :
            decisao.tom === 'warning' ? 'text-amber-700 dark:text-amber-400' :
            'text-emerald-700 dark:text-emerald-400',
          ]"
        >
          Por que comprar
        </h4>
        <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{{ decisao.texto }}</p>
      </section>

      <!-- Recomendações da IA -->
      <section v-if="opAtivas.length || opInativas.length" class="space-y-2.5">
        <h4 class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          <Sparkles class="h-4 w-4" /> Recomendações da IA
        </h4>

        <article
          v-for="op in opAtivas"
          :key="op.id"
          class="rounded-xl border border-violet-100 bg-violet-50/30 p-4 dark:border-violet-500/15 dark:bg-violet-950/10 space-y-2.5"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              Confiança {{ formatStockIntegrinNumber(op.confidence * 100, 0) }}%
            </span>
            <span v-if="op.compra_extra > 0" class="rounded-full bg-violet-600/10 px-2 py-0.5 text-[10px] font-extrabold text-violet-700 dark:text-violet-300">
              Comprar +{{ formatStockIntegrinNumber(op.compra_extra, 0) }} un
            </span>
            <span class="rounded-full border border-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:border-violet-500/30 dark:text-violet-300">
              {{ statusLabel[op.status] }}
            </span>
          </div>

          <p v-if="op.evento_titulo" class="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {{ op.evento_titulo }}
          </p>
          <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{{ op.motivo }}</p>
          <p v-if="op.contra_argumento" class="rounded-lg bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            <span class="font-bold uppercase tracking-wide">Atenção:</span> {{ op.contra_argumento }}
          </p>

          <div class="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              class="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
              @click="onAction(op.id, 'aceita')"
            >
              Aceitar
            </button>
            <button
              type="button"
              class="rounded-lg border border-brand-200 bg-brand-50/80 px-2.5 py-1 text-[11px] font-bold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-slate-950/40 dark:text-brand-300"
              @click="onAction(op.id, 'comprada')"
            >
              Comprado
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300"
              @click="onAction(op.id, 'ignorada')"
            >
              Ignorar
            </button>
          </div>
        </article>

        <p v-if="opInativas.length" class="px-1 text-[11px] text-slate-400 dark:text-slate-500">
          {{ opInativas.length }} recomendação(ões) ignorada(s)/expirada(s) oculta(s).
        </p>
      </section>

      <div v-else class="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
        <Sparkles class="h-4 w-4 shrink-0 opacity-60" />
        Sem recomendações da IA para este produto.
      </div>

      <!-- Rodapé: período analisado + imprimir individual -->
      <footer class="flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p class="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Clock class="h-3.5 w-3.5 shrink-0" />
          {{ periodoResumo }}
        </p>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          :disabled="props.printing"
          @click="emit('print', props.row)"
        >
          <Printer class="h-3.5 w-3.5" :class="props.printing ? 'animate-pulse' : ''" />
          {{ props.printing ? 'Gerando PDF…' : 'Imprimir este produto' }}
        </button>
      </footer>
    </div>
  </ModalGlobal>
</template>
