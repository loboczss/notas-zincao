<script setup lang="ts">
import { computed } from 'vue'
import {
  TrendingUp,
  Package,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-vue-next'
import type { IntegrimProdutoValor } from '../../../shared/types/IntegrimNotas'
import ModalGlobal from '../ModalGlobal.vue'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinDate,
  formatStockIntegrinNumber
} from '../../utils/stock-integrin-format'

const props = defineProps<{
  modelValue: boolean
  produto: IntegrimProdutoValor | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const statusInfo = computed(() => {
  const p = props.produto
  if (!p) return null

  if (p.giro_diario <= 0) {
    return {
      label: 'Sem venda recente',
      badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400',
      dot: 'bg-slate-400',
      severity: 'info'
    }
  }
  const dias = p.dias_cobertura
  if (dias !== null && dias < 15) {
    return {
      label: 'Comprar agora (Ruptura em breve)',
      badge: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
      dot: 'bg-rose-500 animate-pulse',
      severity: 'critical'
    }
  }
  if (dias !== null && dias < 45) {
    return {
      label: 'Atenção (Estoque baixo)',
      badge: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
      dot: 'bg-amber-500 animate-pulse',
      severity: 'warning'
    }
  }
  return {
    label: 'Estoque saudável',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
    dot: 'bg-emerald-500',
    severity: 'success'
  }
})

const formatCobertura = (value: number | null) => {
  if (value === null || value === undefined) return 'Sem venda recente'
  if (value >= 999) return 'Mais de 999 dias'
  return `${formatStockIntegrinNumber(value, 0)} dias`
}

const marginPercent = computed(() => {
  const p = props.produto
  if (!p || !p.faturamento_365d || p.faturamento_365d <= 0) return 0
  return (p.margem_365d / p.faturamento_365d) * 100
})
</script>

<template>
  <ModalGlobal
    v-model="isOpen"
    :title="props.produto?.descricao || 'Detalhes do produto'"
    :description="props.produto ? `Empresa ${props.produto.idempresa} · Código ${props.produto.idproduto} / Subcódigo ${props.produto.idsubproduto}` : ''"
    max-width-class="max-w-4xl"
    content-class="p-0"
  >
    <div v-if="props.produto" class="space-y-6 p-6">
      <!-- Badge de Status Geral -->
      <div
        v-if="statusInfo"
        class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-2xs"
        :class="statusInfo.badge"
      >
        <span class="h-2 w-2 rounded-full" :class="statusInfo.dot" />
        <span>{{ statusInfo.label }}</span>
        <span class="hidden md:inline text-xs font-normal opacity-85 ml-auto">
          Cálculo realizado em: {{ formatStockIntegrinDate(props.produto.updated_at) }}
        </span>
      </div>

      <!-- Métricas Principais em Destaque -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Sugestão Compra -->
        <div
          class="rounded-xl border p-4 transition-all duration-200"
          :class="props.produto.sugestao_compra > 0
            ? 'bg-brand-50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/20 shadow-xs'
            : 'bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'"
        >
          <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 v-if="props.produto.sugestao_compra > 0" class="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            Comprar Sugerido
          </dt>
          <dd
            class="mt-2 text-2xl font-extrabold"
            :class="props.produto.sugestao_compra > 0 ? 'text-slate-950 dark:text-slate-50' : 'text-slate-400 dark:text-slate-600'"
          >
            {{ props.produto.sugestao_compra > 0 ? formatStockIntegrinNumber(props.produto.sugestao_compra, 0) : '0' }}
          </dd>
          <dd class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Garante abastecimento por 45 dias
          </dd>
        </div>

        <!-- Giro Diário -->
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp class="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Giro Diário
          </dt>
          <dd class="mt-2 text-2xl font-extrabold text-slate-950 dark:text-slate-50">
            {{ formatStockIntegrinNumber(props.produto.giro_diario, 2) }}
          </dd>
          <dd class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Unidades vendidas por dia
          </dd>
        </div>

        <!-- Estoque Disponível -->
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <dt class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Package class="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Estoque Disponível
          </dt>
          <dd class="mt-2 text-2xl font-extrabold text-slate-950 dark:text-slate-50">
            {{ formatStockIntegrinNumber(props.produto.saldo_disponivel, 0) }}
          </dd>
          <dd class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Quantidade atual utilizável
          </dd>
        </div>

        <!-- Cobertura -->
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
            Cobertura Atual
          </dt>
          <dd class="mt-2 text-2xl font-extrabold text-slate-950 dark:text-slate-50">
            {{ formatCobertura(props.produto.dias_cobertura) }}
          </dd>
          <dd class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Até o estoque zerar completamente
          </dd>
        </div>
      </div>

      <!-- Painel de Detalhes em 2 Colunas -->
      <div class="grid gap-6 md:grid-cols-2">
        <!-- Coluna Esquerda: Tabela de Histórico de Vendas -->
        <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 overflow-hidden">
          <header class="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Histórico de Vendas (Saídas)
            </h4>
          </header>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-850">
              <thead class="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 dark:bg-slate-900/40 dark:text-slate-500">
                <tr>
                  <th class="px-4 py-2.5">Período</th>
                  <th class="px-4 py-2.5 text-right font-bold">Unidades</th>
                  <th class="px-4 py-2.5 text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Últimos 30 dias</td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-950 dark:text-slate-50">{{ formatStockIntegrinNumber(props.produto.qtd_30d, 0) }}</td>
                  <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{{ formatStockIntegrinCurrency(props.produto.faturamento_30d) }}</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Últimos 90 dias</td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-950 dark:text-slate-50">{{ formatStockIntegrinNumber(props.produto.qtd_90d, 0) }}</td>
                  <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{{ formatStockIntegrinCurrency(props.produto.faturamento_90d) }}</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Últimos 180 dias</td>
                  <td class="px-4 py-3 text-right font-semibold text-slate-950 dark:text-slate-50">{{ formatStockIntegrinNumber(props.produto.qtd_180d, 0) }}</td>
                  <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{{ formatStockIntegrinCurrency(props.produto.faturamento_180d) }}</td>
                </tr>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 font-bold bg-slate-50/30 dark:bg-slate-950/10">
                  <td class="px-4 py-3 text-slate-800 dark:text-slate-200">Últimos 12 meses</td>
                  <td class="px-4 py-3 text-right text-slate-950 dark:text-slate-50">{{ formatStockIntegrinNumber(props.produto.qtd_365d, 0) }}</td>
                  <td class="px-4 py-3 text-right text-slate-950 dark:text-slate-50">{{ formatStockIntegrinCurrency(props.produto.faturamento_365d) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Coluna Direita: Métricas Financeiras e Cadastro -->
        <div class="space-y-4">
          <!-- Rentabilidade -->
          <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 overflow-hidden">
            <header class="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Resultado Financeiro (12m)
              </h4>
              <span class="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/50 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 px-2 py-0.5">
                Margem: {{ formatStockIntegrinNumber(marginPercent, 1) }}%
              </span>
            </header>
            <dl class="grid grid-cols-2 gap-4 p-4 text-xs">
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Lucro Estimado (R$)</dt>
                <dd class="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">
                  {{ formatStockIntegrinCurrency(props.produto.margem_365d) }}
                </dd>
              </div>
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Custo Unitário</dt>
                <dd class="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">
                  {{ props.produto.custo_unit === null ? '-' : formatStockIntegrinCurrency(props.produto.custo_unit) }}
                </dd>
              </div>
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Score de Importância</dt>
                <dd class="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">
                  {{ formatStockIntegrinNumber(props.produto.score_valor, 1) }} <span class="text-slate-400">/ 100</span>
                </dd>
              </div>
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Faturamento Total</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {{ formatStockIntegrinCurrency(props.produto.faturamento_365d) }}
                </dd>
              </div>
            </dl>
          </section>

          <!-- Dados de Controle -->
          <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 overflow-hidden">
            <header class="border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Auditoria & Cadastro
              </h4>
            </header>
            <dl class="grid grid-cols-2 gap-4 p-4 text-xs">
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Notas Fiscais Emitidas</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {{ props.produto.num_notas_365d }} saídas
                </dd>
              </div>
              <div>
                <dt class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">Última Venda Registrada</dt>
                <dd class="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {{ props.produto.ultima_venda ? formatStockIntegrinDate(props.produto.ultima_venda) : 'Sem registro' }}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  </ModalGlobal>
</template>
