<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  TrendingUp,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-vue-next'
import type {
  IntegrimCompraOportunidadeStatus,
  IntegrimProdutoValor,
} from '../../../../shared/types/IntegrimNotas'
import ModalGlobal from '../../ModalGlobal.vue'
import InfoTooltip from '../../InfoTooltip.vue'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinDate,
  formatStockIntegrinNumber,
} from '../../../utils/stock-integrin-format'

const props = defineProps<{
  modelValue: boolean
  produto: IntegrimProdutoValor | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'opportunityAction', value: {
    id: string
    status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>
  }): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const showIaSources = ref(false)

const statusInfo = computed(() => {
  const p = props.produto
  if (!p) return null

  if (p.giro_diario <= 0) {
    return {
      label: 'Sem venda no período',
      badge: 'bg-slate-100 text-slate-600 ring-slate-600/10 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-400/20',
      dot: 'bg-slate-400',
      severity: 'info',
    }
  }

  const dias = p.dias_cobertura
  if (dias !== null && dias < 15) {
    return {
      label: 'Comprar agora',
      badge: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-900/50',
      dot: 'bg-rose-500 animate-pulse',
      severity: 'critical',
    }
  }

  if (dias !== null && dias < 45) {
    return {
      label: 'Atenção',
      badge: 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-900/50',
      dot: 'bg-amber-500 animate-pulse',
      severity: 'warning',
    }
  }

  return {
    label: 'Estoque saudável',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-900/50',
    dot: 'bg-emerald-500',
    severity: 'success',
  }
})

const opportunity = computed(() => props.produto?.ai_oportunidade || null)

const investimentoEstimado = computed(() => {
  const p = props.produto
  if (!p || !p.custo_unit || !p.sugestao_compra || p.sugestao_compra <= 0) return 0
  return p.sugestao_compra * p.custo_unit
})

const diagnostico = computed(() => {
  const p = props.produto
  if (!p) return null

  const giro = p.giro_diario || 0
  const estoque = p.saldo_disponivel || 0
  const coberturaAlvo = p.coverage_days || 45
  const coberturaAtual = p.dias_cobertura
  const sugestao = p.sugestao_compra || 0

  const estoqueIdeal = Math.round(giro * coberturaAlvo)

  if (sugestao > 0) {
    if (coberturaAtual !== null && coberturaAtual <= 0) {
      return {
        titulo: 'Ruptura de estoque (Estoque zerado)',
        tipo: 'danger',
        texto: `Este produto está sem estoque disponível. Com demanda diária de <strong>${formatStockIntegrinNumber(giro, 1)} unidades/dia</strong>, você já está perdendo faturamento. A sugestão de <strong>${formatStockIntegrinNumber(sugestao, 0)} unidades</strong> visa restabelecer o estoque de segurança ideal de <strong>${formatStockIntegrinNumber(estoqueIdeal, 0)} unidades</strong> para cobrir os próximos <strong>${coberturaAlvo} dias</strong>.`,
      }
    }
    if (coberturaAtual !== null && coberturaAtual < 15) {
      return {
        titulo: 'Risco crítico de ruptura de estoque',
        tipo: 'warning',
        texto: `Seu estoque atual de <strong>${formatStockIntegrinNumber(estoque, 0)} unidades</strong> dura apenas <strong>${formatStockIntegrinNumber(coberturaAtual, 1)} dias</strong>. Recomenda-se comprar <strong>${formatStockIntegrinNumber(sugestao, 0)} unidades</strong> para evitar a perda de vendas e atingir a meta de <strong>${coberturaAlvo} dias</strong> de cobertura (estoque ideal de <strong>${formatStockIntegrinNumber(estoqueIdeal, 0)} unidades</strong>).`,
      }
    }
    return {
      titulo: 'Reposição preventiva necessária',
      tipo: 'info',
      texto: `Para manter a cobertura ideal de <strong>${coberturaAlvo} dias</strong> (estoque ideal de <strong>${formatStockIntegrinNumber(estoqueIdeal, 0)} unidades</strong>), seu estoque de <strong>${formatStockIntegrinNumber(estoque, 0)} unidades</strong> (cobertura de <strong>${coberturaAtual !== null ? formatStockIntegrinNumber(coberturaAtual, 1) + ' dias' : '—'}</strong>) precisa ser complementado. Sugerimos a compra de <strong>${formatStockIntegrinNumber(sugestao, 0)} unidades</strong>.`,
    }
  } else {
    return {
      titulo: 'Estoque saudável e seguro',
      tipo: 'success',
      texto: `Seu estoque atual de <strong>${formatStockIntegrinNumber(estoque, 0)} unidades</strong> é suficiente para os próximos <strong>${coberturaAtual !== null ? formatStockIntegrinNumber(coberturaAtual, 0) : '—'} dias</strong>, superando a cobertura alvo de <strong>${coberturaAlvo} dias</strong>. Nenhuma compra de reposição é recomendada no momento.`,
    }
  }
})

const marginPercent = computed(() => {
  const p = props.produto
  if (!p || !p.faturamento_periodo || p.faturamento_periodo <= 0) return 0
  return (p.margem_periodo / p.faturamento_periodo) * 100
})

const variacaoQuantidade = computed(() => props.produto?.variacao_qtd_percent ?? null)
const variacaoFaturamento = computed(() => props.produto?.variacao_faturamento_percent ?? null)

const formatCobertura = (value: number | null) => {
  if (value === null || value === undefined) return '0 dias'
  if (value >= 999) return '999+ dias'
  return `${formatStockIntegrinNumber(value, 0)} dias`
}

const formatDateOnly = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) return '-'
  const date = new Date(`${raw.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

const periodLabel = computed(() => {
  const p = props.produto
  if (!p?.date_start || !p.date_end) return 'Período filtrado'
  return `${formatDateOnly(p.date_start)} a ${formatDateOnly(p.date_end)}`
})

const formatPercentChange = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatStockIntegrinNumber(value, 1)}%`
}

const evidenceLabel = (evidence: unknown) => {
  if (!evidence || typeof evidence !== 'object') return String(evidence || '')
  const record = evidence as Record<string, unknown>
  return String(record.resumo || record.summary || record.motivo || record.reason || JSON.stringify(record))
}

const sourceLabel = (source: unknown) => {
  if (!source || typeof source !== 'object') return String(source || '')
  const record = source as Record<string, unknown>
  return String(record.title || record.titulo || record.url || 'Fonte')
}

const sourceUrl = (source: unknown) => {
  if (!source || typeof source !== 'object') return ''
  return String((source as Record<string, unknown>).url || '').trim()
}

const opportunityAction = (
  status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>,
) => {
  if (!opportunity.value) return
  emit('opportunityAction', { id: opportunity.value.id, status })
}
</script>

<template>
  <ModalGlobal
    v-model="isOpen"
    :title="props.produto?.descricao || 'Detalhes do produto'"
    :description="props.produto ? `Empresa ${props.produto.idempresa} | Código ${props.produto.idproduto} / Subcódigo ${props.produto.idsubproduto}` : ''"
    max-width-class="max-w-3xl"
    content-class="p-0"
  >
    <div v-if="props.produto" class="space-y-5 p-5 md:p-6 overflow-x-hidden">
      
      <!-- Linha Superior de Status e Atualização -->
      <div v-if="statusInfo" class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset"
            :class="statusInfo.badge"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="statusInfo.dot" />
            {{ statusInfo.label }}
          </span>
          <span class="text-xs text-slate-400 dark:text-slate-500">
            Cálculo atualizado em: {{ formatStockIntegrinDate(props.produto.updated_at) }}
          </span>
        </div>
        <div class="text-xs font-semibold text-slate-400 dark:text-slate-500">
          Empresa {{ props.produto.idempresa }} · Código #{{ props.produto.idproduto }}
        </div>
      </div>

      <!-- Grid de KPIs de Decisão de Compra (Painel Executivo) -->
      <div class="grid gap-3 grid-cols-2 md:grid-cols-4">
        <!-- 1. Reposição Sugerida -->
        <div class="rounded-xl border p-4 transition-all duration-200"
          :class="props.produto.sugestao_compra > 0
            ? 'bg-brand-50/50 border-brand-200 dark:bg-brand-500/5 dark:border-brand-500/20 shadow-xs'
            : 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'"
        >
          <div class="flex items-center text-slate-400 dark:text-slate-500">
            <span class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Package class="h-3.5 w-3.5" :class="props.produto.sugestao_compra > 0 ? 'text-brand-500' : 'text-slate-400'" />
              Comprar
            </span>
            <InfoTooltip align="left" text="Quantidade ideal a ser comprada para garantir o estoque seguro nos próximos dias." />
          </div>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-2xl font-extrabold tracking-tight" :class="props.produto.sugestao_compra > 0 ? 'text-slate-950 dark:text-slate-50' : 'text-slate-400 dark:text-slate-600'">
              {{ props.produto.sugestao_compra > 0 ? formatStockIntegrinNumber(props.produto.sugestao_compra, 0) : '0' }}
            </span>
            <span class="text-xs font-semibold text-slate-400">un</span>
          </div>
          <div class="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span v-if="investimentoEstimado > 0" class="text-brand-700 dark:text-brand-400">
              Custo: {{ formatStockIntegrinCurrency(investimentoEstimado) }}
            </span>
            <span v-else class="text-slate-400 font-normal">Alvo: {{ props.produto.coverage_days }} dias</span>
          </div>
        </div>

        <!-- 2. Estoque Atual -->
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div class="flex items-center text-slate-400 dark:text-slate-500">
            <span class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Layers class="h-3.5 w-3.5 text-slate-400" />
              Em Estoque
            </span>
            <InfoTooltip align="left" text="Quantidade total de peças guardada atualmente no seu estoque físico." />
          </div>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50">
              {{ formatStockIntegrinNumber(props.produto.saldo_disponivel, 0) }}
            </span>
            <span class="text-xs font-semibold text-slate-400">un</span>
          </div>
          <div class="mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Custo unit: {{ props.produto.custo_unit ? formatStockIntegrinCurrency(props.produto.custo_unit) : '—' }}
          </div>
        </div>

        <!-- 3. Giro Diário -->
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div class="flex items-center text-slate-400 dark:text-slate-500">
            <span class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <TrendingUp class="h-3.5 w-3.5 text-slate-400" />
              Giro Diário
            </span>
            <InfoTooltip align="right" text="Média de quantas unidades são vendidas por dia útil." />
          </div>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50">
              {{ formatStockIntegrinNumber(props.produto.giro_diario, 2) }}
            </span>
            <span class="text-xs font-semibold text-slate-400">/dia</span>
          </div>
          <div class="mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Saídas: {{ props.produto.num_notas_periodo }} notas
          </div>
        </div>

        <!-- 4. Cobertura Atual -->
        <div class="rounded-xl border p-4 transition-all duration-200"
          :class="statusInfo?.severity === 'critical'
            ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/10 dark:border-rose-900/30 shadow-xs'
            : statusInfo?.severity === 'warning'
              ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/30'
              : 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30'"
        >
          <div class="flex items-center text-slate-400 dark:text-slate-500">
            <span class="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock class="h-3.5 w-3.5" :class="statusInfo?.severity === 'critical' ? 'text-rose-500 animate-pulse' : statusInfo?.severity === 'warning' ? 'text-amber-500' : 'text-emerald-500'" />
              Cobertura
            </span>
            <InfoTooltip align="right" text="Quantidade de dias que o estoque atual aguenta as vendas antes de zerar." />
          </div>
          <div class="mt-2 flex items-baseline gap-1">
            <span class="text-2xl font-extrabold tracking-tight"
              :class="statusInfo?.severity === 'critical' ? 'text-rose-700 dark:text-rose-400' : statusInfo?.severity === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'"
            >
              {{ props.produto.dias_cobertura !== null ? formatStockIntegrinNumber(props.produto.dias_cobertura, 0) : '0' }}
            </span>
            <span class="text-xs font-semibold text-slate-400">dias</span>
          </div>
          <div class="mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Alvo ideal: {{ props.produto.coverage_days }} dias
          </div>
        </div>
      </div>

      <!-- Card de Oportunidades / Sugestão Extra da IA -->
      <section v-if="opportunity"
        class="overflow-hidden rounded-xl border border-violet-100 bg-violet-50/20 p-4 dark:border-violet-500/10 dark:bg-violet-950/10 space-y-3"
      >
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div class="flex items-start gap-2.5">
            <div class="mt-0.5 rounded-lg bg-violet-100 p-1.5 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              <Sparkles class="h-4 w-4" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-violet-900 dark:text-violet-300 flex items-center gap-1">
                  Insight Inteligente IA
                  <InfoTooltip text="Sugestão de compra incremental identificada pela IA com base em tendências externas ou obras na região." />
                </h4>
                <span class="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  Confiança: {{ formatStockIntegrinNumber(opportunity.confidence * 100, 0) }}%
                </span>
              </div>
              <p class="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Sugerido: <span class="text-violet-700 dark:text-violet-300 font-bold">+{{ formatStockIntegrinNumber(opportunity.compra_extra, 0) }} un</span> extra devido ao evento: "{{ opportunity.evento_titulo || 'Oportunidade externa' }}"
              </p>
              <p class="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {{ opportunity.motivo }}
              </p>
            </div>
          </div>

          <!-- Botões de Decisão do Insight -->
          <div class="flex shrink-0 items-center gap-1.5 justify-end mt-2 md:mt-0">
            <button
              type="button"
              class="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
              @click="opportunityAction('aceita')"
            >
              Aceitar
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300"
              @click="opportunityAction('ignorada')"
            >
              Ignorar
            </button>
            <button
              type="button"
              class="rounded-lg border border-brand-200 bg-brand-50/80 px-2.5 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-slate-950/40 dark:text-brand-300"
              @click="opportunityAction('comprada')"
            >
              Comprado
            </button>
          </div>
        </div>

        <!-- Seção de Evidências e Fontes da IA (Expansível) -->
        <div v-if="opportunity.evidencias?.length || opportunity.fontes?.length || opportunity.contra_argumento" class="pt-1">
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300 transition"
            @click="showIaSources = !showIaSources"
          >
            <span>{{ showIaSources ? 'Ocultar fontes e contra-argumentos' : 'Ver evidências e fontes capturadas' }}</span>
            <ChevronDown v-if="!showIaSources" class="h-3 w-3" />
            <ChevronUp v-else class="h-3 w-3" />
          </button>

          <!-- Drawer de Fontes da IA -->
          <div v-show="showIaSources" class="mt-2.5 grid gap-3 border-t border-violet-100 dark:border-violet-500/10 pt-3 text-xs md:grid-cols-2 animate-fade-in">
            <div class="space-y-3.5">
              <div v-if="opportunity.evidencias?.length">
                <h5 class="text-[10px] font-bold uppercase tracking-wider text-violet-850 dark:text-violet-400 mb-1">Evidências de Mercado</h5>
                <ul class="space-y-1">
                  <li v-for="(evidence, index) in opportunity.evidencias.slice(0, 3)" :key="index"
                    class="rounded-lg bg-white/70 px-2.5 py-1.5 border border-violet-100/50 dark:bg-slate-900/60 dark:border-violet-950/30 text-[11px] text-slate-700 dark:text-slate-300"
                  >
                    {{ evidenceLabel(evidence) }}
                  </li>
                </ul>
              </div>

              <div v-if="opportunity.fontes?.length">
                <h5 class="text-[10px] font-bold uppercase tracking-wider text-violet-850 dark:text-violet-400 mb-1">Fontes Oficiais</h5>
                <ul class="space-y-1">
                  <li v-for="(source, index) in opportunity.fontes.slice(0, 3)" :key="index"
                    class="rounded-lg bg-white/70 px-2.5 py-1.5 border border-violet-100/50 dark:bg-slate-900/60 dark:border-violet-950/30 text-[11px]"
                  >
                    <a v-if="sourceUrl(source)" :href="sourceUrl(source)" target="_blank" rel="noopener noreferrer"
                      class="font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 dark:text-violet-450 hover:text-violet-900"
                      @click.stop
                    >
                      {{ sourceLabel(source) }}
                    </a>
                    <span v-else class="text-slate-600 dark:text-slate-400">{{ sourceLabel(source) }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div class="space-y-3">
              <div v-if="opportunity.contra_argumento" class="rounded-lg bg-white/70 p-3 border border-violet-100/50 dark:bg-slate-900/60 dark:border-violet-950/30">
                <h5 class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Fatores de Atenção / Contra-argumentos</h5>
                <p class="text-slate-650 dark:text-slate-350 text-[11px] leading-relaxed">
                  {{ opportunity.contra_argumento }}
                </p>
              </div>
              
              <div class="rounded-lg bg-white/70 p-2.5 border border-violet-100/50 dark:bg-slate-900/60 dark:border-violet-950/30 flex items-center justify-between text-[11px]">
                <span class="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Status da Recomendação</span>
                <span class="rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase border"
                  :class="opportunity.status === 'nova' ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
                >
                  {{ opportunity.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Grade Central: ROI/Resultado Comercial & Histórico de Demanda -->
      <div class="grid gap-5 md:grid-cols-2">
        
        <!-- Bloco Financeiro (Patrão Foca em Rentabilidade) -->
        <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 overflow-hidden flex flex-col justify-between">
          <header class="border-b border-slate-100 bg-slate-50/50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <Coins class="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              Viabilidade Financeira
            </h4>
            <span class="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/50 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 flex items-center gap-0.5">
              Margem Bruta: {{ formatStockIntegrinNumber(marginPercent, 1) }}%
              <InfoTooltip align="right" text="É a porcentagem que sobra do valor de venda após pagar o custo do fornecedor. Por exemplo: se a margem é de 29%, a cada R$ 100,00 vendidos, sobram R$ 29,00 de lucro bruto para a empresa." />
            </span>
          </header>
          
          <div class="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
            <div class="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt class="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9px] flex items-center gap-0.5">
                  Lucro Estimado
                  <InfoTooltip align="left" text="Dinheiro real que entrou no bolso (Vendas menos Custo das mercadorias vendidas)." />
                </dt>
                <dd class="mt-1 text-base font-extrabold text-slate-950 dark:text-slate-50">
                  {{ formatStockIntegrinCurrency(props.produto.margem_periodo) }}
                </dd>
              </div>
              <div>
                <dt class="text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider text-[9px] flex items-center gap-0.5">
                  Faturamento Bruto
                  <InfoTooltip align="right" text="Faturamento total acumulado nas vendas (sem descontar os custos)." />
                </dt>
                <dd class="mt-1 text-base font-semibold text-slate-800 dark:text-slate-250">
                  {{ formatStockIntegrinCurrency(props.produto.faturamento_periodo) }}
                </dd>
              </div>
            </div>

            <!-- Score de Importância no Estoque -->
            <div class="border-t border-slate-100 dark:border-slate-800/60 pt-3 flex-1 flex flex-col justify-center">
              <div class="flex items-center justify-between text-xs mb-1">
                <dt class="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9px] flex items-center gap-0.5">
                  Relevância (Curva ABC / Score)
                  <InfoTooltip align="left" text="Nota de 0 a 100 de importância. Acima de 75 indica que é um dos principais geradores de lucro e não pode faltar." />
                </dt>
                <span class="font-extrabold text-slate-850 dark:text-slate-200">
                  {{ formatStockIntegrinNumber(props.produto.score_valor, 1) }} <span class="text-slate-450 font-normal text-[10px]">/ 100</span>
                </span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" 
                  :style="{ width: `${props.produto.score_valor}%` }"
                  :class="props.produto.score_valor >= 75 ? 'bg-emerald-500' : props.produto.score_valor >= 45 ? 'bg-amber-500' : 'bg-slate-450'"
                />
              </div>
            </div>

            <!-- Metadados de Auditoria Rápidos -->
            <div class="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3 text-[11px]">
              <div>
                <span class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Transações</span>
                <p class="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">
                  {{ props.produto.num_notas_periodo }} notas de saída
                </p>
              </div>
              <div>
                <span class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Última Saída</span>
                <p class="mt-0.5 font-semibold text-slate-700 dark:text-slate-300">
                  {{ props.produto.ultima_venda ? formatDateOnly(props.produto.ultima_venda) : 'Sem registro' }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Bloco de Demanda Histórica Compacta (Substitui tabela verticalmente gigante) -->
        <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 overflow-hidden">
          <header class="border-b border-slate-100 bg-slate-50/50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar class="h-4 w-4 text-brand-600 dark:text-brand-500" />
              Fluxo de Vendas e Demanda
            </h4>
          </header>

          <div class="divide-y divide-slate-100 dark:divide-slate-800/50 text-[11px] leading-tight">
            <!-- Período Selecionado -->
            <div class="px-4 py-2.5 flex items-center justify-between">
              <div>
                <p class="font-bold text-slate-800 dark:text-slate-200">Ciclo Atual Filtrado</p>
                <p class="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">{{ periodLabel }}</p>
              </div>
              <div class="text-right">
                <p class="font-extrabold text-slate-950 dark:text-slate-50 text-xs">
                  {{ formatStockIntegrinNumber(props.produto.qtd_periodo, 0) }} un
                </p>
                <p class="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
                  {{ formatStockIntegrinCurrency(props.produto.faturamento_periodo) }}
                </p>
              </div>
            </div>

            <!-- Período Anterior Equivalente -->
            <div class="px-4 py-2.5 flex items-center justify-between">
              <div>
                <p class="font-semibold text-slate-700 dark:text-slate-300">Ciclo Anterior Equivalente</p>
                <p class="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">Comparativo homólogo</p>
              </div>
              <div class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <span class="font-bold text-slate-800 dark:text-slate-250">
                    {{ formatStockIntegrinNumber(props.produto.prev_qtd_periodo, 0) }} un
                  </span>
                  <span class="inline-flex items-center text-[10px] font-extrabold rounded-md px-1 py-0.5" 
                    :class="Number(variacaoQuantidade || 0) >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'"
                  >
                    <ArrowUpRight v-if="Number(variacaoQuantidade || 0) >= 0" class="h-2.5 w-2.5 shrink-0" />
                    <ArrowDownRight v-else class="h-2.5 w-2.5 shrink-0" />
                    {{ formatPercentChange(variacaoQuantidade) }}
                  </span>
                </div>
                <p class="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
                  {{ formatStockIntegrinCurrency(props.produto.prev_faturamento_periodo) }}
                </p>
              </div>
            </div>

            <!-- Últimos 90 dias -->
            <div class="px-4 py-2.5 flex items-center justify-between">
              <div>
                <p class="font-semibold text-slate-700 dark:text-slate-300">Trimestre (Últimos 90 dias)</p>
                <p class="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">Visão de curto prazo</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-slate-800 dark:text-slate-250">
                  {{ formatStockIntegrinNumber(props.produto.qtd_90d, 0) }} un
                </p>
                <p class="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
                  {{ formatStockIntegrinCurrency(props.produto.faturamento_90d) }}
                </p>
              </div>
            </div>

            <!-- Anual -->
            <div class="px-4 py-2.5 flex items-center justify-between">
              <div>
                <p class="font-semibold text-slate-700 dark:text-slate-300">Anual (Últimos 12 meses)</p>
                <p class="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">Histórico consolidado</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-slate-800 dark:text-slate-250">
                  {{ formatStockIntegrinNumber(props.produto.qtd_365d, 0) }} un
                </p>
                <p class="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
                  {{ formatStockIntegrinCurrency(props.produto.faturamento_365d) }}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Diagnóstico de Estoque Explicativo (Fundo) -->
      <div v-if="diagnostico" class="rounded-xl border p-4 transition-all duration-200 text-slate-850 dark:text-slate-200"
        :class="[
          diagnostico.tipo === 'danger' ? 'bg-rose-50/20 border-rose-200/60 dark:bg-rose-950/10 dark:border-rose-900/30 shadow-xs' :
          diagnostico.tipo === 'warning' ? 'bg-amber-50/20 border-amber-200/60 dark:bg-amber-950/10 dark:border-amber-900/30' :
          diagnostico.tipo === 'info' ? 'bg-blue-50/20 border-blue-200/60 dark:bg-blue-950/10 dark:border-blue-900/30' :
          'bg-emerald-50/20 border-emerald-200/60 dark:bg-emerald-950/10 dark:border-emerald-900/30'
        ]"
      >
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1.5">
          <Lightbulb class="h-4 w-4 shrink-0" :class="[
            diagnostico.tipo === 'danger' ? 'text-rose-600 dark:text-rose-400' :
            diagnostico.tipo === 'warning' ? 'text-amber-600 dark:text-amber-400' :
            diagnostico.tipo === 'info' ? 'text-blue-600 dark:text-blue-400' :
            'text-emerald-600 dark:text-emerald-400'
          ]" />
          <span>Diagnóstico e Justificativa de Reposição</span>
        </div>
        <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-350" v-html="diagnostico.texto" />
      </div>

      <!-- Rodapé com disclaimer explicativo sutil -->
      <footer class="flex items-start gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 leading-normal border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <Info class="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-350 dark:text-slate-500" />
        <span>
          O cálculo da quantidade sugerida é matemático e considera a média de saídas agregadas diárias e a meta de cobertura. A IA analisa notícias e licitações capturadas regionalmente para propor compras extras preventivas opcionais.
        </span>
      </footer>

    </div>
  </ModalGlobal>
</template>

