<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { HelpCircle } from 'lucide-vue-next'
import type { IntegrimProdutoValor } from '../../../../shared/types/IntegrimNotas'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../../utils/stock-integrin-format'
import PrevisaoComprasProductCard from './PrevisaoComprasProductCard.vue'
import PageEmptyState from '../../PageEmptyState.vue'

const props = withDefaults(defineProps<{
  produtos: IntegrimProdutoValor[]
  loadingInitial?: boolean
  isAdmin?: boolean
}>(), {
  loadingInitial: false,
  isAdmin: false,
})

const emit = defineEmits<{
  (e: 'select', produto: IntegrimProdutoValor): void
}>()

type SortField =
  | 'descricao'
  | 'status'
  | 'giro_diario'
  | 'saldo_disponivel'
  | 'dias_cobertura'
  | 'sugestao_compra'
  | 'ai_oportunidade'
  | 'faturamento_periodo'
  | 'margem_periodo'
  | 'score_valor'

const currentSortField = ref<SortField | null>(null)
const currentSortDir = ref<'asc' | 'desc' | null>(null)

const toggleSort = (field: SortField) => {
  if (currentSortField.value === field) {
    if (currentSortDir.value === 'desc') {
      currentSortDir.value = 'asc'
    } else if (currentSortDir.value === 'asc') {
      currentSortDir.value = null
      currentSortField.value = null
    } else {
      currentSortDir.value = 'desc'
    }
  } else {
    currentSortField.value = field
    currentSortDir.value = 'desc'
  }
}

const getStatusLabel = (p: IntegrimProdutoValor) => {
  if (p.giro_diario <= 0) return 0
  const dias = p.dias_cobertura
  if (dias !== null && dias < 15) return 3 // Comprar
  if (dias !== null && dias < 45) return 2 // Atenção
  return 1 // Saudável
}

const getProdutoStatus = (p: IntegrimProdutoValor) => {
  if (p.giro_diario <= 0) {
    return {
      label: 'Sem venda',
      badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
      textClass: 'text-slate-400 dark:text-slate-500',
    }
  }

  const dias = p.dias_cobertura
  if (dias !== null && dias < 15) {
    return {
      label: 'Comprar',
      badge: 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40',
      textClass: 'text-rose-600 dark:text-rose-400 font-bold',
    }
  }

  if (dias !== null && dias < 45) {
    return {
      label: 'Atenção',
      badge: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40',
      textClass: 'text-amber-600 dark:text-amber-400 font-semibold',
    }
  }

  return {
    label: 'Saudável',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  }
}

const formatCobertura = (value: number | null) => {
  if (value === null || value === undefined) return '-'
  if (value >= 999) return '999+ dias'
  return `${formatStockIntegrinNumber(value, 0)} dias`
}

const sortedProdutos = computed(() => {
  if (!currentSortField.value || !currentSortDir.value) {
    return props.produtos
  }

  const list = [...props.produtos]
  const field = currentSortField.value
  const dir = currentSortDir.value === 'asc' ? 1 : -1

  list.sort((a, b) => {
    let valA: any = null
    let valB: any = null

    if (field === 'descricao') {
      valA = a.descricao || `Produto ${a.idproduto}`
      valB = b.descricao || `Produto ${b.idproduto}`
      return valA.localeCompare(valB, 'pt-BR') * dir
    }

    if (field === 'status') {
      valA = getStatusLabel(a)
      valB = getStatusLabel(b)
    } else if (field === 'ai_oportunidade') {
      valA = a.ai_oportunidade ? a.ai_oportunidade.compra_extra : 0
      valB = b.ai_oportunidade ? b.ai_oportunidade.compra_extra : 0
    } else if (field === 'dias_cobertura') {
      valA = a.dias_cobertura === null ? 999999 : a.dias_cobertura
      valB = b.dias_cobertura === null ? 999999 : b.dias_cobertura
    } else {
      valA = (a as any)[field] ?? 0
      valB = (b as any)[field] ?? 0
    }

    if (valA < valB) return -1 * dir
    if (valA > valB) return 1 * dir
    return 0
  })

  return list
})

watch(() => props.produtos, (newVal, oldVal) => {
  if (!newVal || !oldVal || newVal.length <= oldVal.length) {
    currentSortField.value = null
    currentSortDir.value = null
  }
}, { deep: false })
</script>

<template>
  <div class="space-y-4">
    <!-- Estado de Carregamento Inicial (Skeletons compactos) -->
    <div v-if="props.loadingInitial" class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40" aria-busy="true">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
          <thead class="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900/60 dark:text-slate-500">
            <tr class="select-none">
              <th class="px-3 py-2">Produto / Identificação</th>
              <th class="px-3 py-2 text-center">Status</th>
              <th class="px-3 py-2 text-right">Giro / Dia</th>
              <th class="px-3 py-2 text-right">Estoque</th>
              <th class="px-3 py-2 text-right">Cobertura</th>
              <th class="px-3 py-2 text-right">Comprar</th>
              <th class="px-3 py-2 text-right">IA</th>
              <th class="px-3 py-2 text-right">Faturamento</th>
              <th class="px-3 py-2 text-right">Lucro</th>
              <th class="px-3 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="i in 5" :key="i" class="animate-pulse">
              <td class="px-3 py-2">
                <div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-5/6 mb-1" />
                <div class="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </td>
              <td class="px-3 py-2"><div class="h-4 bg-slate-100 dark:bg-slate-800 rounded w-12 mx-auto" /></td>
              <td class="px-3 py-2"><div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-8 ml-auto" /></td>
              <td class="px-3 py-2"><div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-10 ml-auto" /></td>
              <td class="px-3 py-2"><div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-14 ml-auto" /></td>
              <td class="px-3 py-2"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-10 ml-auto" /></td>
              <td class="px-3 py-2"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-10 ml-auto" /></td>
              <td class="px-3 py-2"><div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-16 ml-auto" /></td>
              <td class="px-3 py-2"><div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-16 ml-auto" /></td>
              <td class="px-3 py-2"><div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-8 ml-auto" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Estado de Lista Vazia -->
    <PageEmptyState
      v-else-if="!props.produtos.length"
      title="Nenhum produto analisado"
      :description="props.isAdmin 
        ? 'Use o botão \'Sincronizar\' acima para buscar as notas do Integrim e processar a análise.' 
        : 'Não há dados de previsão gerados no momento. Aguarde a sincronização executada por um administrador.'"
    >
      <template #icon>
        <HelpCircle class="h-6 w-6" />
      </template>
    </PageEmptyState>

    <!-- Mobile Card View -->
    <div class="block lg:hidden space-y-3">
      <div
        v-for="produto in sortedProdutos"
        :key="produto.id"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/40 space-y-3 hover:border-brand-500 transition-colors cursor-pointer"
        @click="emit('select', produto)"
      >
        <!-- Title and company -->
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h4 class="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-2">
              {{ produto.descricao || `Produto ${produto.idproduto}` }}
            </h4>
            <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-semibold">
              <span>Empresa {{ produto.idempresa }}</span>
              <span>·</span>
              <span class="font-mono">Cód: {{ produto.idproduto }}/{{ produto.idsubproduto }}</span>
            </div>
          </div>
          <!-- Status Badge -->
          <div class="shrink-0">
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold"
              :class="getProdutoStatus(produto).badge"
            >
              {{ getProdutoStatus(produto).label }}
            </span>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-950/40 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Giro / Dia</span>
            <span class="tabular-nums">{{ formatStockIntegrinNumber(produto.giro_diario, 1) }}</span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Estoque</span>
            <span class="tabular-nums">{{ formatStockIntegrinNumber(produto.saldo_disponivel, 0) }}</span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Cobertura</span>
            <span class="tabular-nums font-bold" :class="getProdutoStatus(produto).textClass">
              {{ formatCobertura(produto.dias_cobertura) }}
            </span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Comprar</span>
            <span class="tabular-nums font-bold text-brand-600 dark:text-brand-400">
              {{ produto.sugestao_compra > 0 ? formatStockIntegrinNumber(produto.sugestao_compra, 0) : '—' }}
            </span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Sugestão IA</span>
            <span class="tabular-nums font-bold text-violet-700 dark:text-violet-300">
              {{ produto.ai_oportunidade ? `+${formatStockIntegrinNumber(produto.ai_oportunidade.compra_extra, 0)}` : '—' }}
            </span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Score</span>
            <span class="tabular-nums font-bold text-slate-800 dark:text-slate-200">
              {{ formatStockIntegrinNumber(produto.score_valor, 1) }}
            </span>
          </div>
        </div>

        <!-- Footer: Faturamento e Lucro -->
        <div class="flex items-center justify-between text-[10px] border-t border-slate-100 dark:border-slate-800/60 pt-2 font-semibold text-slate-500">
          <div>
            Faturamento: <span class="text-slate-700 dark:text-slate-300 font-bold">{{ formatStockIntegrinCurrency(produto.faturamento_periodo) }}</span>
          </div>
          <div>
            Lucro: <span class="text-slate-700 dark:text-slate-300 font-bold">{{ formatStockIntegrinCurrency(produto.margem_periodo) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabela Real de Dados (Minimalista e Compacta - Desktop Only) -->
    <div class="hidden lg:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
          <thead class="bg-slate-50/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900/60 dark:text-slate-500 select-none">
            <tr>
              <!-- Produto / Identificação -->
              <th
                class="px-3 py-2 cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('descricao')"
              >
                <div class="flex items-center gap-1">
                  <span>Produto / Identificação</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'descricao' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'descricao' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Status -->
              <th
                class="px-3 py-2 text-center cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('status')"
              >
                <div class="flex items-center justify-center gap-1">
                  <span>Status</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'status' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'status' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Giro / Dia -->
              <th
                class="px-3 py-2 text-right cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('giro_diario')"
              >
                <div class="flex items-center justify-end gap-1">
                  <span>Giro / Dia</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'giro_diario' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'giro_diario' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Estoque -->
              <th
                class="px-3 py-2 text-right cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('saldo_disponivel')"
              >
                <div class="flex items-center justify-end gap-1">
                  <span>Estoque</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'saldo_disponivel' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'saldo_disponivel' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Cobertura -->
              <th
                class="px-3 py-2 text-right cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('dias_cobertura')"
              >
                <div class="flex items-center justify-end gap-1">
                  <span>Cobertura</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'dias_cobertura' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'dias_cobertura' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Comprar -->
              <th
                class="px-3 py-2 text-right cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('sugestao_compra')"
              >
                <div class="flex items-center justify-end gap-1">
                  <span>Comprar</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'sugestao_compra' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'sugestao_compra' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- IA -->
              <th
                class="px-3 py-2 text-right cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('ai_oportunidade')"
              >
                <div class="flex items-center justify-end gap-1">
                  <span>IA</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'ai_oportunidade' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'ai_oportunidade' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Faturamento -->
              <th
                class="px-3 py-2 text-right cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('faturamento_periodo')"
              >
                <div class="flex items-center justify-end gap-1">
                  <span>Faturamento</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'faturamento_periodo' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'faturamento_periodo' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Lucro -->
              <th
                class="px-3 py-2 text-right cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('margem_periodo')"
              >
                <div class="flex items-center justify-end gap-1">
                  <span>Lucro</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'margem_periodo' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'margem_periodo' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Score -->
              <th
                class="px-3 py-2 text-right cursor-pointer group hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                @click="toggleSort('score_valor')"
              >
                <div class="flex items-center justify-end gap-1">
                  <span>Score</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'score_valor' ? 'text-brand-500 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'"
                  >
                    {{ currentSortField === 'score_valor' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <PrevisaoComprasProductCard
              v-for="produto in sortedProdutos"
              :key="produto.id"
              :produto="produto"
              @select="emit('select', $event)"
            />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
