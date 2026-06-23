<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  TrendingUp,
} from 'lucide-vue-next'
import type {
  IntegrimCompraOportunidadeStatus,
  IntegrimProdutoValor,
} from '../../../../shared/types/IntegrimNotas'
import ModalGlobal from '../../ModalGlobal.vue'
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

const statusInfo = computed(() => {
  const p = props.produto
  if (!p) return null

  if (p.giro_diario <= 0) {
    return {
      label: 'Sem venda no periodo',
      badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400',
      dot: 'bg-slate-400',
      severity: 'info',
    }
  }

  const dias = p.dias_cobertura
  if (dias !== null && dias < 15) {
    return {
      label: 'Comprar agora',
      badge: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
      dot: 'bg-rose-500 animate-pulse',
      severity: 'critical',
    }
  }

  if (dias !== null && dias < 45) {
    return {
      label: 'Atencao',
      badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
      dot: 'bg-amber-500 animate-pulse',
      severity: 'warning',
    }
  }

  return {
    label: 'Estoque saudavel',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    dot: 'bg-emerald-500',
    severity: 'success',
  }
})

const opportunity = computed(() => props.produto?.ai_oportunidade || null)

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
        titulo: 'Ruptura Detectada (Estoque Zerado/Negativo)',
        tipo: 'danger',
        texto: `Este produto está sem estoque disponível no momento. Com uma demanda diária de <strong>${formatStockIntegrinNumber(giro, 1)} unidades/dia</strong>, você já está perdendo vendas. A sugestão de <strong>${formatStockIntegrinNumber(sugestao, 0)} unidades</strong> visa restabelecer o estoque ideal de <strong>${formatStockIntegrinNumber(estoqueIdeal, 0)} unidades</strong> para cobrir os próximos <strong>${coberturaAlvo} dias</strong>.`,
      }
    }
    if (coberturaAtual !== null && coberturaAtual < 15) {
      return {
        titulo: 'Risco Crítico de Ruptura',
        tipo: 'warning',
        texto: `Seu estoque atual de <strong>${formatStockIntegrinNumber(estoque, 0)} unidades</strong> dura apenas <strong>${formatStockIntegrinNumber(coberturaAtual, 1)} dias</strong>, o que é menor que o tempo de segurança. Recomenda-se comprar <strong>${formatStockIntegrinNumber(sugestao, 0)} unidades</strong> para evitar a ruptura e atingir a meta de <strong>${coberturaAlvo} dias</strong> de cobertura (estoque ideal de <strong>${formatStockIntegrinNumber(estoqueIdeal, 0)} unidades</strong>).`,
      }
    }
    return {
      titulo: 'Reposição Necessária',
      tipo: 'info',
      texto: `Para manter a cobertura ideal de <strong>${coberturaAlvo} dias</strong> (estoque ideal de <strong>${formatStockIntegrinNumber(estoqueIdeal, 0)} unidades</strong>), seu estoque atual de <strong>${formatStockIntegrinNumber(estoque, 0)} unidades</strong> (cobertura de <strong>${coberturaAtual !== null ? formatStockIntegrinNumber(coberturaAtual, 1) + ' dias' : '—'}</strong>) precisa ser complementado. Sugerimos a compra de <strong>${formatStockIntegrinNumber(sugestao, 0)} unidades</strong>.`,
    }
  } else {
    return {
      titulo: 'Estoque Saudável',
      tipo: 'success',
      texto: `Seu estoque atual de <strong>${formatStockIntegrinNumber(estoque, 0)} unidades</strong> é suficiente para cobrir os próximos <strong>${coberturaAtual !== null ? formatStockIntegrinNumber(coberturaAtual, 0) : '—'} dias</strong>, superando a cobertura alvo de <strong>${coberturaAlvo} dias</strong>. Nenhuma compra é recomendada no momento.`,
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
  if (value === null || value === undefined) return 'Sem venda no periodo'
  if (value >= 999) return 'Mais de 999 dias'
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
  if (!p?.date_start || !p.date_end) return 'Periodo selecionado'
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
    :description="props.produto ? `Empresa ${props.produto.idempresa} | Codigo ${props.produto.idproduto} / Subcodigo ${props.produto.idsubproduto}` : ''"
    max-width-class="max-w-4xl"
    content-class="p-0"
  >
    <div v-if="props.produto" class="space-y-6 p-6">
      <div
        v-if="statusInfo"
        class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-2xs"
        :class="statusInfo.badge"
      >
        <span class="h-2 w-2 rounded-full" :class="statusInfo.dot" />
        <span>{{ statusInfo.label }}</span>
        <span class="hidden md:inline text-xs font-normal opacity-85 ml-auto">
          Calculo em: {{ formatStockIntegrinDate(props.produto.updated_at) }}
        </span>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          class="rounded-xl border p-4 transition-all duration-200"
          :class="props.produto.sugestao_compra > 0
            ? 'bg-brand-50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/20 shadow-xs'
            : 'bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'"
        >
          <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 v-if="props.produto.sugestao_compra > 0" class="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            Comprar calculado
          </dt>
          <dd
            class="mt-2 text-2xl font-extrabold"
            :class="props.produto.sugestao_compra > 0 ? 'text-slate-950 dark:text-slate-50' : 'text-slate-400 dark:text-slate-600'"
          >
            {{ props.produto.sugestao_compra > 0 ? formatStockIntegrinNumber(props.produto.sugestao_compra, 0) : '0' }}
          </dd>
          <dd class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Cobertura alvo: {{ props.produto.coverage_days }} dias
          </dd>
        </div>

        <div
          class="rounded-xl border p-4"
          :class="opportunity
            ? 'border-violet-200 bg-violet-50 dark:border-violet-500/25 dark:bg-violet-500/10'
            : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40'"
        >
          <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles class="h-3.5 w-3.5 text-violet-500" />
            Compra extra IA
          </dt>
          <dd class="mt-2 text-2xl font-extrabold text-slate-950 dark:text-slate-50">
            {{ opportunity ? `+${formatStockIntegrinNumber(opportunity.compra_extra, 0)}` : '0' }}
          </dd>
          <dd class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            {{ opportunity ? `Confianca ${formatStockIntegrinNumber(opportunity.confidence * 100, 0)}%` : 'Sem sugestao aberta' }}
          </dd>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp class="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Giro diario
          </dt>
          <dd class="mt-2 text-2xl font-extrabold text-slate-950 dark:text-slate-50">
            {{ formatStockIntegrinNumber(props.produto.giro_diario, 2) }}
          </dd>
          <dd class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Unidades por dia no filtro
          </dd>
        </div>

        <div
          class="rounded-xl border p-4"
          :class="statusInfo?.severity === 'critical'
            ? 'bg-rose-50/50 border-rose-200 text-rose-950 dark:bg-rose-950/20 dark:border-rose-900/50'
            : statusInfo?.severity === 'warning'
              ? 'bg-amber-50/50 border-amber-200 text-amber-950 dark:bg-amber-950/20 dark:border-amber-900/50'
              : 'bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'"
        >
          <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <AlertTriangle v-if="statusInfo?.severity !== 'success' && statusInfo?.severity !== 'info'" class="h-3.5 w-3.5 text-rose-500" />
            Cobertura atual
          </dt>
          <dd class="mt-2 text-2xl font-extrabold text-slate-950 dark:text-slate-50">
            {{ formatCobertura(props.produto.dias_cobertura) }}
          </dd>
          <dd class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Ate o estoque zerar
          </dd>
        </div>
      </div>

      <!-- Diagnóstico do Estoque & Justificativa do Cálculo -->
      <div v-if="diagnostico" class="rounded-xl border p-4.5 space-y-2 transition-all duration-200 text-slate-800 dark:text-slate-200"
        :class="[
          diagnostico.tipo === 'danger' ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/10 dark:border-rose-900/30' :
          diagnostico.tipo === 'warning' ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/30' :
          diagnostico.tipo === 'info' ? 'bg-blue-50/40 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/30' :
          'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/30'
        ]"
      >
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <Info class="h-4 w-4 shrink-0" :class="[
            diagnostico.tipo === 'danger' ? 'text-rose-600 dark:text-rose-400' :
            diagnostico.tipo === 'warning' ? 'text-amber-600 dark:text-amber-400' :
            diagnostico.tipo === 'info' ? 'text-blue-600 dark:text-blue-400' :
            'text-emerald-600 dark:text-emerald-400'
          ]" />
          <span>{{ diagnostico.titulo }}</span>
        </div>
        <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300" v-html="diagnostico.texto" />
      </div>

      <section
        v-if="opportunity"
        class="overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60 dark:border-violet-500/25 dark:bg-violet-500/10"
      >
        <header class="flex flex-col gap-3 border-b border-violet-100 px-4 py-3 dark:border-violet-500/20 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-violet-900 dark:text-violet-200">
              Por que a IA sugeriu
            </h4>
            <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {{ opportunity.evento_titulo || 'Oportunidade externa' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-950 dark:text-emerald-300"
              @click="opportunityAction('aceita')"
            >
              Aceitar
            </button>
            <button
              type="button"
              class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              @click="opportunityAction('ignorada')"
            >
              Ignorar
            </button>
            <button
              type="button"
              class="rounded-md border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50 dark:border-brand-500/30 dark:bg-slate-950 dark:text-brand-300"
              @click="opportunityAction('comprada')"
            >
              Marcar comprado
            </button>
          </div>
        </header>
        <div class="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr]">
          <div class="space-y-3">
            <p class="text-sm text-slate-700 dark:text-slate-200">
              {{ opportunity.motivo }}
            </p>
            <div v-if="opportunity.evidencias?.length" class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Evidencias</p>
              <ul class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <li
                  v-for="(evidence, index) in opportunity.evidencias.slice(0, 4)"
                  :key="index"
                  class="rounded-md border border-violet-100 bg-white/80 px-3 py-2 dark:border-violet-500/20 dark:bg-slate-950/60"
                >
                  {{ evidenceLabel(evidence) }}
                </li>
              </ul>
            </div>
            <div v-if="opportunity.fontes?.length" class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Fontes</p>
              <ul class="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <li
                  v-for="(source, index) in opportunity.fontes.slice(0, 4)"
                  :key="index"
                  class="rounded-md border border-violet-100 bg-white/80 px-3 py-2 dark:border-violet-500/20 dark:bg-slate-950/60"
                >
                  <a
                    v-if="sourceUrl(source)"
                    :href="sourceUrl(source)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 dark:text-violet-300"
                    @click.stop
                  >
                    {{ sourceLabel(source) }}
                  </a>
                  <span v-else>{{ sourceLabel(source) }}</span>
                </li>
              </ul>
            </div>
          </div>

          <dl class="space-y-3 text-xs">
            <div class="rounded-md border border-violet-100 bg-white/80 p-3 dark:border-violet-500/20 dark:bg-slate-950/60">
              <dt class="font-bold uppercase tracking-wider text-slate-400">Contra-argumento</dt>
              <dd class="mt-1 text-slate-700 dark:text-slate-300">
                {{ opportunity.contra_argumento || 'Sem contra-argumento registrado.' }}
              </dd>
            </div>
            <div class="rounded-md border border-violet-100 bg-white/80 p-3 dark:border-violet-500/20 dark:bg-slate-950/60">
              <dt class="font-bold uppercase tracking-wider text-slate-400">Status</dt>
              <dd class="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {{ opportunity.status }}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div class="grid gap-6 md:grid-cols-2">
        <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 overflow-hidden">
          <header class="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Historico de vendas
            </h4>
          </header>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
              <thead class="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:bg-slate-900/40 dark:text-slate-500">
                <tr>
                  <th class="px-4 py-2.5">Periodo</th>
                  <th class="px-4 py-2.5 text-right font-bold">Unidades</th>
                  <th class="px-4 py-2.5 text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr class="font-bold bg-slate-50/30 dark:bg-slate-950/10">
                  <td class="px-4 py-3 text-slate-800 dark:text-slate-200">{{ periodLabel }}</td>
                  <td class="px-4 py-3 text-right text-slate-950 dark:text-slate-50">{{ formatStockIntegrinNumber(props.produto.qtd_periodo, 0) }}</td>
                  <td class="px-4 py-3 text-right text-slate-950 dark:text-slate-50">{{ formatStockIntegrinCurrency(props.produto.faturamento_periodo) }}</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Periodo anterior equivalente</td>
                  <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                    {{ formatStockIntegrinNumber(props.produto.prev_qtd_periodo, 0) }}
                    <span class="ml-1 text-[10px]" :class="Number(variacaoQuantidade || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                      {{ formatPercentChange(variacaoQuantidade) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                    {{ formatStockIntegrinCurrency(props.produto.prev_faturamento_periodo) }}
                    <span class="ml-1 text-[10px]" :class="Number(variacaoFaturamento || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                      {{ formatPercentChange(variacaoFaturamento) }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Ultimos 90 dias</td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-950 dark:text-slate-50">{{ formatStockIntegrinNumber(props.produto.qtd_90d, 0) }}</td>
                  <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{{ formatStockIntegrinCurrency(props.produto.faturamento_90d) }}</td>
                </tr>
                <tr>
                  <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Ultimos 12 meses</td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-950 dark:text-slate-50">{{ formatStockIntegrinNumber(props.produto.qtd_365d, 0) }}</td>
                  <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{{ formatStockIntegrinCurrency(props.produto.faturamento_365d) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div class="space-y-4">
          <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 overflow-hidden">
            <header class="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Resultado financeiro
              </h4>
              <span class="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/50 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 px-2 py-0.5">
                Margem: {{ formatStockIntegrinNumber(marginPercent, 1) }}%
              </span>
            </header>
            <dl class="grid grid-cols-2 gap-4 p-4 text-xs">
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Lucro estimado</dt>
                <dd class="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">
                  {{ formatStockIntegrinCurrency(props.produto.margem_periodo) }}
                </dd>
              </div>
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Custo unitario</dt>
                <dd class="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">
                  {{ props.produto.custo_unit === null ? '-' : formatStockIntegrinCurrency(props.produto.custo_unit) }}
                </dd>
              </div>
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Score</dt>
                <dd class="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">
                  {{ formatStockIntegrinNumber(props.produto.score_valor, 1) }} <span class="text-slate-400">/ 100</span>
                </dd>
              </div>
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Faturamento</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {{ formatStockIntegrinCurrency(props.produto.faturamento_periodo) }}
                </dd>
              </div>
            </dl>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 overflow-hidden">
            <header class="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Auditoria e cadastro
              </h4>
            </header>
            <dl class="grid grid-cols-2 gap-4 p-4 text-xs">
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Notas no periodo</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {{ props.produto.num_notas_periodo }} saidas
                </dd>
              </div>
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Ultima venda</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {{ props.produto.ultima_venda ? formatStockIntegrinDate(props.produto.ultima_venda) : 'Sem registro' }}
                </dd>
              </div>
            </dl>
          </section>

          <section class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div class="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Info class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                O calculo usa apenas vendas agregadas por produto. A IA usa produto, estoque, vendas agregadas e fontes publicas; nao cria compra automaticamente.
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  </ModalGlobal>
</template>
