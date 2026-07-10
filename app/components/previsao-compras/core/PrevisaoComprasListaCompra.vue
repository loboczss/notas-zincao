<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  RefreshCw,
  ShoppingCart,
  Wallet,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Printer,
} from 'lucide-vue-next'
import type {
  IntegrimCompraAiOportunidade,
  IntegrimListaCompraQuery,
  IntegrimListaCompraRow,
  IntegrimListaCompraStats,
} from '../../../../shared/types/IntegrimNotas'
import { formatStockIntegrinNumber } from '../../../utils/stock-integrin-format'

import SelectInput from '../../SelectInput.vue'
import Input from '../../Input.vue'
import Botao from '../../Botao.vue'
import InfoTooltip from '../../InfoTooltip.vue'
import InfiniteScrollTrigger from '../../InfiniteScrollTrigger.vue'
import PcSectionHeader from '../ui/PcSectionHeader.vue'

const props = withDefaults(defineProps<{
  rows: IntegrimListaCompraRow[]
  stats: IntegrimListaCompraStats | null
  loading?: boolean
  totalItens?: number
  oportunidadesMap?: Map<string, IntegrimCompraAiOportunidade[]>
  printing?: boolean
}>(), {
  loading: false,
  totalItens: 0,
  oportunidadesMap: () => new Map(),
  printing: false,
})

const emit = defineEmits<{
  (e: 'fetch', query: IntegrimListaCompraQuery, options?: { append?: boolean }): void
  (e: 'abrir', row: IntegrimListaCompraRow): void
  (e: 'print', payload: { idempresa: number | null }): void
}>()

const filtros = reactive({
  idempresa: '' as string,
  search: '',
  onlyBuy: true,
})

const page = ref(1)

const sortState = reactive({
  column: 'risco',
  direction: 'desc' as 'asc' | 'desc',
})

const empresas = ['1', '2', '3', '4', '5', '6']

// Ao buscar (nome ou codigo), varre o catalogo inteiro: quem procura um produto
// especifico quer acha-lo mesmo que ele nao precise de reposicao agora. Sem busca,
// respeita o toggle "So repor agora".
const buscando = computed(() => filtros.search.trim().length > 0)

const buildQuery = (pageToLoad = 1): IntegrimListaCompraQuery => ({
  idempresa: filtros.idempresa ? Number(filtros.idempresa) : null,
  only_buy: buscando.value ? false : filtros.onlyBuy,
  sort: 'risco',
  search: filtros.search,
  page: pageToLoad,
  page_size: 50,
})

const aplicar = () => {
  page.value = 1
  emit('fetch', buildQuery(1), { append: false })
}

const temMais = computed(() => props.rows.length < (props.totalItens || 0))

const carregarMais = () => {
  if (props.loading || !temMais.value) return
  page.value += 1
  emit('fetch', buildQuery(page.value), { append: true })
}

const toggleOnlyBuy = () => {
  filtros.onlyBuy = !filtros.onlyBuy
  aplicar()
}

// Trocar de empresa recalcula do zero (roda após o v-model atualizar).
watch(() => filtros.idempresa, () => aplicar())

const imprimir = () => emit('print', { idempresa: filtros.idempresa ? Number(filtros.idempresa) : null })

const handleSort = (colName: string) => {
  if (sortState.column === colName) {
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortState.column = colName
    sortState.direction = 'desc'
  }
}

const rowKey = (row: IntegrimListaCompraRow) => `${row.idempresa}-${row.idproduto}-${row.idsubproduto}`

const oportunidadesDe = (row: IntegrimListaCompraRow) => props.oportunidadesMap.get(rowKey(row)) || []

// Só marca o selo quando há recomendação ativa (não ignorada / não expirada).
const iaAtiva = (row: IntegrimListaCompraRow) =>
  oportunidadesDe(row).some(op => op.status !== 'ignorada' && op.status !== 'expirada')

const sortedRows = computed(() => {
  const col = sortState.column
  const dir = sortState.direction
  if (!col) return props.rows

  const pick = (row: IntegrimListaCompraRow): number | string | null => {
    switch (col) {
      case 'produto': return row.descricao
      case 'estoque': return row.saldo_disponivel
      case 'demanda': return row.demanda_diaria
      case 'ruptura': return row.dias_ate_ruptura
      case 'sugestao': return row.sugestao_compra
      case 'capital': return row.capital_necessario
      case 'risco': return row.dinheiro_em_risco
      default: return null
    }
  }

  return [...props.rows].sort((a, b) => {
    const valA = pick(a)
    const valB = pick(b)
    if (valA == null && valB == null) return 0
    if (valA == null) return 1
    if (valB == null) return -1
    if (typeof valA === 'string' && typeof valB === 'string') {
      return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }
    return dir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
  })
})

const moeda = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const rupturaTone = (dias: number | null) => {
  if (dias === null) return 'text-slate-400 dark:text-slate-500'
  if (dias <= 2) return 'text-rose-600 dark:text-rose-400 font-extrabold'
  if (dias <= 7) return 'text-amber-600 dark:text-amber-400 font-semibold'
  return 'text-slate-600 dark:text-slate-300 font-medium'
}

const temItens = computed(() => props.rows.length > 0)
</script>

<template>
  <div class="space-y-4">
    <PcSectionHeader
      :title="buscando ? 'Resultados da busca' : (filtros.onlyBuy ? 'Comprar agora' : 'Todos os produtos')"
      :subtitle="buscando
        ? 'Busca por nome ou código no catálogo inteiro — inclusive itens que não precisam repor agora.'
        : (filtros.onlyBuy
          ? 'Itens abaixo do ponto de reposição — precisam de compra para não faltar.'
          : 'Catálogo completo com os mesmos indicadores de decisão.')"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition"
            :class="filtros.onlyBuy
              ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'"
            @click="toggleOnlyBuy"
          >
            <span class="relative inline-flex h-4 w-7 items-center rounded-full transition" :class="filtros.onlyBuy ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'">
              <span class="inline-block h-3 w-3 transform rounded-full bg-white transition" :class="filtros.onlyBuy ? 'translate-x-3.5' : 'translate-x-0.5'" />
            </span>
            Só repor agora
          </button>

          <Botao
            type="button"
            variant="secondary"
            class="h-8.5 px-3 text-xs font-semibold shrink-0 flex items-center gap-1.5"
            :disabled="props.printing"
            @click="imprimir"
          >
            <Printer class="h-3.5 w-3.5" :class="props.printing ? 'animate-pulse' : ''" />
            {{ filtros.idempresa ? `Relatório empresa ${filtros.idempresa}` : 'Relatório geral' }}
          </Botao>
        </div>
      </template>
    </PcSectionHeader>

    <!-- KPIs da decisão -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
        <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <ShoppingCart class="h-3.5 w-3.5 text-brand-500" /> Itens para comprar
        </div>
        <div class="mt-0.5 text-xl font-black text-slate-900 dark:text-slate-100">
          {{ formatStockIntegrinNumber(props.stats?.itens_comprar || 0, 0) }}
        </div>
        <div class="text-[10px] text-slate-400 dark:text-slate-500">Abaixo do ponto de reposição</div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
        <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Wallet class="h-3.5 w-3.5 text-brand-500" /> Capital necessário
        </div>
        <div class="mt-0.5 text-xl font-black text-slate-900 dark:text-slate-100">
          {{ moeda(props.stats?.capital_total || 0) }}
        </div>
        <div class="text-[10px] text-slate-400 dark:text-slate-500">Investimento sugerido estimado</div>
      </div>

      <div class="col-span-2 sm:col-span-1 rounded-xl border border-rose-200 bg-rose-500/5 p-3.5 shadow-xs dark:border-rose-900/20 dark:bg-rose-950/10">
        <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          <AlertTriangle class="h-3.5 w-3.5" /> Faturamento em risco
        </div>
        <div class="mt-0.5 text-xl font-black text-rose-700 dark:text-rose-300">
          {{ moeda(props.stats?.risco_total || 0) }}
        </div>
        <div class="text-[10px] text-rose-500/80 dark:text-rose-400/80">Margem perdida sem reposição</div>
      </div>
    </div>

    <!-- Busca + filtro de empresa -->
    <div class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          v-model="filtros.search"
          type="search"
          placeholder="Buscar produto pelo nome ou código…"
          size="sm"
          class="h-8.5 flex-1 text-xs"
          @keyup.enter="aplicar"
        />
        <div class="flex items-center gap-2">
          <SelectInput v-model="filtros.idempresa" size="sm" class="h-8.5 w-40 text-xs">
            <option value="">Todas as empresas</option>
            <option v-for="e in empresas" :key="e" :value="e">Empresa {{ e }}</option>
          </SelectInput>
          <Botao
            type="button"
            variant="accent"
            class="h-8.5 px-4 text-xs font-semibold shrink-0"
            :disabled="props.loading"
            @click="aplicar"
          >
            <RefreshCw class="h-3.5 w-3.5 mr-1.5" :class="props.loading ? 'animate-spin' : ''" />
            Recalcular
          </Botao>
        </div>
      </div>
    </div>

    <!-- Mobile cards -->
    <div class="block lg:hidden space-y-3">
      <div v-if="props.loading && !temItens" class="py-8 text-center text-slate-400 dark:text-slate-500">Calculando...</div>
      <div v-else-if="!temItens" class="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
        {{ buscando ? 'Nenhum produto encontrado para essa busca.' : (filtros.onlyBuy ? 'Nenhum item precisa de compra agora. 🎉' : 'Nenhum produto encontrado.') }}
      </div>
      <div
        v-else
        v-for="row in sortedRows"
        :key="rowKey(row)"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/40 space-y-3 hover:border-brand-500 transition-colors cursor-pointer"
        @click="emit('abrir', row)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <h4 class="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-2">{{ row.descricao }}</h4>
              <span v-if="iaAtiva(row)" class="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 py-0.5 text-[8px] font-extrabold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 shrink-0">
                <Sparkles class="h-2.5 w-2.5" /> IA
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-semibold">
              <span>Empresa {{ row.idempresa }}</span>
              <span>·</span>
              <span class="font-mono">Cód: {{ row.idproduto }}/{{ row.idsubproduto }}</span>
            </div>
          </div>
          <div class="shrink-0 text-right">
            <span class="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Comprar</span>
            <span class="inline-block font-black text-brand-700 dark:text-brand-400 bg-brand-50 border border-brand-100 rounded-lg px-2 py-0.5 text-xs dark:bg-brand-500/10 dark:border-brand-500/25 mt-0.5">
              {{ formatStockIntegrinNumber(row.sugestao_compra, 0) }} un
            </span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-950/40 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Saldo</span>
            <span class="tabular-nums">{{ formatStockIntegrinNumber(row.saldo_disponivel, 0) }}</span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Demanda/dia</span>
            <span class="tabular-nums">{{ formatStockIntegrinNumber(row.demanda_diaria, 1) }}</span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Ruptura</span>
            <span class="tabular-nums font-bold" :class="rupturaTone(row.dias_ate_ruptura)">
              {{ row.dias_ate_ruptura == null ? '—' : `${formatStockIntegrinNumber(row.dias_ate_ruptura, 1)}d` }}
            </span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Capital</span>
            <span class="tabular-nums">{{ moeda(row.capital_necessario) }}</span>
          </div>
          <div class="col-span-2">
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Risco</span>
            <span class="tabular-nums font-bold text-rose-600 dark:text-rose-400">{{ moeda(row.dinheiro_em_risco) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabela desktop -->
    <div class="hidden lg:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
      <table class="w-full min-w-[760px] text-xs">
        <thead>
          <tr class="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 select-none">
            <th class="px-3 py-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('produto')">
              <div class="flex items-center gap-1">
                <span>Produto</span>
                <ArrowUp v-if="sortState.column === 'produto' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'produto' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>
            <th class="px-3 py-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('estoque')">
              <div class="flex items-center justify-end gap-1">
                <span>Saldo</span>
                <InfoTooltip title="Saldo atual" text="Quantidade física atual em estoque disponível." align="center" />
                <ArrowUp v-if="sortState.column === 'estoque' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'estoque' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>
            <th class="px-3 py-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('demanda')">
              <div class="flex items-center justify-end gap-1">
                <span>Demanda/dia</span>
                <InfoTooltip title="Demanda média diária" text="Média diária de vendas no período, incluindo dias sem venda." align="center" />
                <ArrowUp v-if="sortState.column === 'demanda' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'demanda' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>
            <th class="px-3 py-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('ruptura')">
              <div class="flex items-center justify-end gap-1">
                <span>Ruptura</span>
                <InfoTooltip title="Dias até ruptura" text="Tempo estimado que o estoque atual aguenta antes de zerar (saldo ÷ demanda/dia)." align="center" />
                <ArrowUp v-if="sortState.column === 'ruptura' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'ruptura' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>
            <th class="px-3 py-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('sugestao')">
              <div class="flex items-center justify-end gap-1">
                <span>Comprar</span>
                <InfoTooltip title="Sugestão de compra" text="Quantidade ideal para cobrir o lead time mais a cobertura desejada, descontando o saldo atual." align="center" />
                <ArrowUp v-if="sortState.column === 'sugestao' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'sugestao' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>
            <th class="px-3 py-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('capital')">
              <div class="flex items-center justify-end gap-1">
                <span>Capital</span>
                <InfoTooltip title="Capital necessário" text="Investimento para adquirir o total sugerido (sugestão × custo unitário)." align="center" />
                <ArrowUp v-if="sortState.column === 'capital' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'capital' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>
            <th class="px-3 py-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('risco')">
              <div class="flex items-center justify-end gap-1">
                <span>Risco</span>
                <InfoTooltip title="Faturamento em risco" text="Margem estimada perdida caso ocorra ruptura antes da reposição chegar." align="right" />
                <ArrowUp v-if="sortState.column === 'risco' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'risco' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading && !temItens">
            <td colspan="7" class="px-3 py-8 text-center text-slate-400 dark:text-slate-500">Calculando...</td>
          </tr>
          <tr v-else-if="!temItens">
            <td colspan="7" class="px-3 py-8 text-center text-slate-400 dark:text-slate-500 font-medium">{{ buscando ? 'Nenhum produto encontrado para essa busca.' : (filtros.onlyBuy ? 'Nenhum item precisa de compra agora. 🎉' : 'Nenhum produto encontrado.') }}</td>
          </tr>
          <tr
            v-else
            v-for="row in sortedRows"
            :key="rowKey(row)"
            class="border-b border-slate-100/50 last:border-0 hover:bg-slate-50/35 dark:border-slate-800/40 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
            @click="emit('abrir', row)"
          >
            <td class="px-3 py-1.5">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-800 dark:text-slate-200 line-clamp-1" :title="row.descricao">{{ row.descricao }}</span>
                <span v-if="iaAtiva(row)" class="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 py-0.5 text-[8px] font-extrabold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 shrink-0">
                  <Sparkles class="h-2.5 w-2.5" /> IA
                </span>
              </div>
              <div class="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                <span>Emp. {{ row.idempresa }}</span>
                <span>·</span>
                <span>{{ row.idproduto }}/{{ row.idsubproduto }}</span>
                <span v-if="row.estoque_ausente" class="rounded bg-amber-100 px-1 font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">sem cadastro de estoque</span>
              </div>
            </td>
            <td class="px-3 py-1.5 text-right font-medium tabular-nums text-slate-700 dark:text-slate-300">{{ formatStockIntegrinNumber(row.saldo_disponivel, 0) }}</td>
            <td class="px-3 py-1.5 text-right font-medium tabular-nums text-slate-700 dark:text-slate-300">{{ formatStockIntegrinNumber(row.demanda_diaria, 1) }}</td>
            <td class="px-3 py-1.5 text-right font-semibold tabular-nums" :class="rupturaTone(row.dias_ate_ruptura)">
              {{ row.dias_ate_ruptura == null ? '—' : `${formatStockIntegrinNumber(row.dias_ate_ruptura, 1)}d` }}
            </td>
            <td class="px-3 py-1.5 text-right font-black tabular-nums text-brand-700 dark:text-brand-300">{{ formatStockIntegrinNumber(row.sugestao_compra, 0) }}</td>
            <td class="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-600 dark:text-slate-300">{{ moeda(row.capital_necessario) }}</td>
            <td class="px-3 py-1.5 text-right font-bold tabular-nums text-rose-600 dark:text-rose-400">{{ moeda(row.dinheiro_em_risco) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <InfiniteScrollTrigger
      v-if="temItens"
      :loading="props.loading && temItens"
      :done="!temMais"
      :loaded-count="props.rows.length"
      :total="props.totalItens || 0"
      label="itens"
      done-label="Todos os itens foram carregados."
      @load-more="carregarMais"
    />

    <p class="px-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
      Comprar quando o estoque cruza o <strong>ponto de reposição</strong> = demanda diária × lead time + estoque de segurança.
      O selo <strong class="text-violet-500">IA</strong> indica que existe uma recomendação da IA para o item — abra o produto para ver.
    </p>
  </div>
</template>
