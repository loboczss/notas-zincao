<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  AlertTriangle,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowUp,
  ArrowDown,
} from 'lucide-vue-next'
import type {
  IntegrimListaCompraQuery,
  IntegrimListaCompraRow,
  IntegrimListaCompraSort,
  IntegrimListaCompraStats,
  IntegrimProdutoValor,
} from '../../../../shared/types/IntegrimNotas'
import { formatStockIntegrinNumber } from '../../../utils/stock-integrin-format'
import { getApiFetch } from '../../../utils/api-fetch'
import { usePrevisaoComprasStore } from '../../../stores'

// Componentes Reutilizáveis do Sistema
import SelectInput from '../../SelectInput.vue'
import Input from '../../Input.vue'
import Botao from '../../Botao.vue'
import InfoTooltip from '../../InfoTooltip.vue'

const props = withDefaults(defineProps<{
  rows: IntegrimListaCompraRow[]
  stats: IntegrimListaCompraStats | null
  loading?: boolean
  totalItens?: number
}>(), {
  loading: false,
  totalItens: 0,
  zZz: 0, // dummy
})

const emit = defineEmits<{
  (e: 'fetch', query: IntegrimListaCompraQuery): void
}>()

const store = usePrevisaoComprasStore()

// Controles locais
const filtros = reactive({
  idempresa: '' as string,
  leadTime: '7',
  coverage: '30',
  serviceLevel: '0.95',
  horizon: '90',
  sort: 'risco' as IntegrimListaCompraSort,
  search: '',
})

// Visibilidade dos parâmetros avançados
const showAdvanced = ref(false)

// Ordenação Local (Frontend-side fallback)
const sortState = reactive({
  column: 'risco', // Padrão: Risco
  direction: 'desc' as 'asc' | 'desc',
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

const handleSort = (colName: string) => {
  if (sortState.column === colName) {
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'
  } else {
    sortState.column = colName
    sortState.direction = 'desc' // Maior ou pior primeiro por padrão
  }
}

// Abrir modal detalhado buscando produto real ou gerando mock
const abrirDetalhe = async (row: IntegrimListaCompraRow) => {
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
    const data = await apiFetch<any>('/api/integrim-notas/analise', {
      query: {
        idempresa: row.idempresa,
        search: `${row.idproduto}/${row.idsubproduto}`,
        page_size: 1
      }
    })
    if (data?.produtos?.length) {
      const match = data.produtos.find((p: any) => 
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
  
  // 3. Fallback: mock estruturado
  store.produtoSelecionado = {
    id: `${row.idempresa}-${row.idproduto}-${row.idsubproduto}`,
    idempresa: row.idempresa,
    idproduto: row.idproduto,
    idsubproduto: row.idsubproduto,
    descricao: row.descricao,
    saldo_disponivel: row.saldo_disponivel,
    giro_diario: row.demanda_diaria,
    dias_cobertura: row.dias_ate_ruptura,
    sugestao_compra: row.sugestao_compra,
    score_valor: row.dinheiro_em_risco > 0 ? 50 : 0,
    faturamento_periodo: row.demanda_diaria * 30 * (row.capital_necessario / (row.sugestao_compra || 1)),
    margem_periodo: row.dinheiro_em_risco,
    custo_unit: row.sugestao_compra > 0 ? row.capital_necessario / row.sugestao_compra : null,
    updated_at: new Date().toISOString(),
    date_start: '',
    date_end: '',
    coverage_days: Number(filtros.coverage),
    prev_qtd_periodo: 0,
    prev_faturamento_periodo: 0,
    variacao_qtd_percent: null,
    variacao_faturamento_percent: null,
    qtd_periodo: row.demanda_diaria * 30,
    qtd_90d: row.demanda_diaria * 90,
    faturamento_90d: 0,
    qtd_365d: row.demanda_diaria * 365,
    faturamento_365d: 0,
    num_notas_periodo: 0,
    ultima_venda: null,
  } as IntegrimProdutoValor
}

// Computed para ordenar as linhas na tela
const sortedRows = computed(() => {
  const col = sortState.column
  const dir = sortState.direction

  if (!col) return props.rows

  return [...props.rows].sort((a, b) => {
    let valA: any = null
    let valB: any = null

    if (col === 'produto') {
      valA = a.descricao
      valB = b.descricao
    } else if (col === 'estoque') {
      valA = a.saldo_disponivel
      valB = b.saldo_disponivel
    } else if (col === 'demanda') {
      valA = a.demanda_diaria
      valB = b.demanda_diaria
    } else if (col === 'ponto_reposicao') {
      valA = a.ponto_reposicao
      valB = b.ponto_reposicao
    } else if (col === 'ruptura') {
      valA = a.dias_ate_ruptura
      valB = b.dias_ate_ruptura
    } else if (col === 'sugestao') {
      valA = a.sugestao_compra
      valB = b.sugestao_compra
    } else if (col === 'capital') {
      valA = a.capital_necessario
      valB = b.capital_necessario
    } else if (col === 'risco') {
      valA = a.dinheiro_em_risco
      valB = b.dinheiro_em_risco
    }

    // Nulos vão para o final
    if (valA === null && valB === null) return 0
    if (valA === null || valA === undefined) return 1
    if (valB === null || valB === undefined) return -1

    if (typeof valA === 'string' && typeof valB === 'string') {
      return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }

    return dir === 'asc' ? valA - valB : valB - valA
  })
})

const moeda = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const empresas = ['1', '2', '3', '4', '5', '6']

const abcTone: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-350',
  B: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-350',
  C: 'bg-slate-105 text-slate-650 dark:bg-slate-800 dark:text-slate-350',
}
const xyzTone: Record<string, string> = {
  X: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-350',
  Y: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-350',
  Z: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-350',
}
const confiancaTone: Record<string, string> = {
  alta: 'text-emerald-600 dark:text-emerald-450',
  media: 'text-amber-600 dark:text-amber-450',
  baixa: 'text-rose-600 dark:text-rose-455',
}

const rupturaTone = (dias: number | null) => {
  if (dias === null) return 'text-slate-400 dark:text-slate-500'
  if (dias <= 2) return 'text-rose-600 dark:text-rose-400 font-extrabold'
  if (dias <= 7) return 'text-amber-650 dark:text-amber-400 font-semibold'
  return 'text-slate-650 dark:text-slate-350 font-medium'
}

const temItens = computed(() => props.rows.length > 0)
</script>

<template>
  <div class="space-y-4">
    <!-- KPIs da decisão (Design premium e mais compacto) -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
        <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">
          <ShoppingCart class="h-3.5 w-3.5 text-brand-500" /> Itens para comprar
        </div>
        <div class="mt-0.5 text-xl font-black text-slate-900 dark:text-slate-100">
          {{ formatStockIntegrinNumber(props.stats?.itens_comprar || 0, 0) }}
        </div>
        <div class="text-[10px] text-slate-400 dark:text-slate-500">Abaixo do ponto de reposição</div>
      </div>
      
      <div class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
        <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-550">
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
        <div class="mt-0.5 text-xl font-black text-rose-700 dark:text-rose-350">
          {{ moeda(props.stats?.risco_total || 0) }}
        </div>
        <div class="text-[10px] text-rose-500/80 dark:text-rose-450/80">Margem que será perdida sem reposição</div>
      </div>
    </div>

    <!-- Controles (Usando componentes globais) -->
    <div class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
      <!-- Gaveta de parâmetros avançados (colapsável) -->
      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="transform opacity-0 -translate-y-2 max-h-0 overflow-hidden"
        enter-to-class="transform opacity-100 translate-y-0 max-h-[500px]"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="transform opacity-100 translate-y-0 max-h-[500px]"
        leave-to-class="transform opacity-0 -translate-y-2 max-h-0 overflow-hidden"
      >
        <div v-show="showAdvanced" class="grid gap-3 grid-cols-2 lg:grid-cols-6 pb-3 mb-3 border-b border-slate-100 dark:border-slate-850">
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-450 dark:text-slate-500">Empresa</span>
            <SelectInput v-model="filtros.idempresa" size="sm" class="h-8.5 text-xs">
              <option value="">Todas</option>
              <option v-for="e in empresas" :key="e" :value="e">Empresa {{ e }}</option>
            </SelectInput>
          </div>
          
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-450 dark:text-slate-500">Lead time (dias)</span>
            <Input v-model="filtros.leadTime" type="number" min="0" max="365" size="sm" class="h-8.5 text-xs" />
          </div>
          
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-450 dark:text-slate-500">Cobertura (dias)</span>
            <Input v-model="filtros.coverage" type="number" min="1" max="365" size="sm" class="h-8.5 text-xs" />
          </div>
          
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-1">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-450 dark:text-slate-500">Nível de serviço</span>
              <InfoTooltip 
                title="Nível de Serviço" 
                text="Meta de probabilidade de não sofrer ruptura enquanto o fornecedor entrega. 95% é o padrão seguro. Índices maiores aumentam o estoque de segurança necessário."
                align="center"
              />
            </div>
            <SelectInput v-model="filtros.serviceLevel" size="sm" class="h-8.5 text-xs">
              <option value="0.90">90%</option>
              <option value="0.95">95%</option>
              <option value="0.975">97,5%</option>
              <option value="0.99">99%</option>
            </SelectInput>
          </div>
          
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-450 dark:text-slate-500">Histórico (dias)</span>
            <SelectInput v-model="filtros.horizon" size="sm" class="h-8.5 text-xs">
              <option value="30">30</option>
              <option value="60">60</option>
              <option value="90">90</option>
              <option value="180">180</option>
              <option value="365">365</option>
            </SelectInput>
          </div>
          
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-450 dark:text-slate-500">Filtro Servidor</span>
            <SelectInput v-model="filtros.sort" size="sm" class="h-8.5 text-xs">
              <option value="risco">Dinheiro em risco</option>
              <option value="ruptura">Dias até ruptura</option>
              <option value="sugestao">Sugestão de compra</option>
              <option value="faturamento">Faturamento</option>
            </SelectInput>
          </div>
        </div>
      </transition>
      
      <!-- Linha Principal de Busca -->
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
          <Botao
            type="button"
            variant="secondary"
            class="h-8.5 px-3.5 text-xs font-semibold shrink-0 flex items-center gap-1.5"
            @click="showAdvanced = !showAdvanced"
          >
            <SlidersHorizontal class="h-3.5 w-3.5" />
            <span>Parâmetros</span>
            <span v-if="filtros.idempresa || filtros.leadTime !== '7' || filtros.coverage !== '30' || filtros.serviceLevel !== '0.95'" class="w-2 h-2 rounded-full bg-brand-500"></span>
          </Botao>
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

    <!-- Mobile Card View -->
    <div class="block lg:hidden space-y-3">
      <div v-if="props.loading && !temItens" class="py-8 text-center text-slate-400 dark:text-slate-500">
        Calculando...
      </div>
      <div v-else-if="!temItens" class="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
        Nenhum item precisa de compra agora. 🎉
      </div>
      <div
        v-else
        v-for="row in sortedRows"
        :key="`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/40 space-y-3 hover:border-brand-500 transition-colors cursor-pointer"
        @click="abrirDetalhe(row)"
      >
        <!-- Product Details -->
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h4 class="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-2">
              {{ row.descricao }}
            </h4>
            <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-semibold">
              <span>Empresa {{ row.idempresa }}</span>
              <span>·</span>
              <span class="font-mono">Cód: {{ row.idproduto }}/{{ row.idsubproduto }}</span>
              <span v-if="row.estoque_ausente" class="rounded bg-amber-100 px-1 font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">sem cadastro</span>
            </div>
          </div>
          <!-- Purchase suggestion badge -->
          <div class="shrink-0 text-right">
            <span class="block text-[8px] font-bold text-slate-400 uppercase tracking-wide">Comprar</span>
            <span class="inline-block font-black text-brand-700 dark:text-brand-400 bg-brand-50 border border-brand-100 rounded-lg px-2 py-0.5 text-xs dark:bg-brand-500/10 dark:border-brand-500/25 mt-0.5">
              {{ formatStockIntegrinNumber(row.sugestao_compra, 0) }} un
            </span>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-950/40 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Estoque</span>
            <span class="tabular-nums">{{ formatStockIntegrinNumber(row.saldo_disponivel, 0) }}</span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Giro / Dia</span>
            <span class="tabular-nums">{{ formatStockIntegrinNumber(row.demanda_diaria, 1) }}</span>
          </div>
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Ponto rep.</span>
            <span class="tabular-nums">{{ formatStockIntegrinNumber(row.ponto_reposicao, 0) }}</span>
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
          <div>
            <span class="block text-[8px] font-bold text-slate-400 uppercase">Risco</span>
            <span class="tabular-nums font-bold text-rose-600 dark:text-rose-450">{{ moeda(row.dinheiro_em_risco) }}</span>
          </div>
        </div>

        <!-- Badges footer -->
        <div class="flex items-center justify-between text-[10px] border-t border-slate-100 dark:border-slate-800/60 pt-2 font-semibold">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400">Curvas:</span>
            <span class="rounded px-1.5 py-0.5 text-[9px] font-extrabold" :class="abcTone[row.classe_abc]">{{ row.classe_abc }}</span>
            <span class="rounded px-1.5 py-0.5 text-[9px] font-extrabold" :class="xyzTone[row.classe_xyz]">{{ row.classe_xyz }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-slate-400">Confiança:</span>
            <span class="capitalize" :class="confiancaTone[row.confianca]">{{ row.confianca }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabela Compacta com Hover Tooltips e Ordenação Frontend (Desktop Only) -->
    <div class="hidden lg:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/40">
      <table class="w-full min-w-[920px] text-xs">
        <thead>
          <tr class="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:border-slate-800 bg-slate-55/40 dark:bg-slate-950/20 select-none">
            
            <th class="px-3 py-2 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('produto')">
              <div class="flex items-center gap-1">
                <span>Produto</span>
                <ArrowUp v-if="sortState.column === 'produto' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'produto' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>

            <th class="px-3 py-2 text-right cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('estoque')">
              <div class="flex items-center justify-end gap-1">
                <span>Estoque</span>
                <InfoTooltip title="Estoque Disponível" text="Quantidade física atual em estoque disponível para movimentações." align="center" />
                <ArrowUp v-if="sortState.column === 'estoque' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'estoque' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>

            <th class="px-3 py-2 text-right cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('demanda')">
              <div class="flex items-center justify-end gap-1">
                <span>Demanda/dia</span>
                <InfoTooltip title="Demanda Média Diária" text="Média diária de vendas no período (ex: faturamento/horizonte de dias), incluindo dias em que não houve venda." align="center" />
                <ArrowUp v-if="sortState.column === 'demanda' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'demanda' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>

            <th class="px-3 py-2 text-right cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('ponto_reposicao')">
              <div class="flex items-center justify-end gap-1">
                <span>Ponto rep.</span>
                <InfoTooltip title="Ponto de Reposição" text="Nível mínimo crítico de estoque que exige nova compra. Se o saldo for menor ou igual a este valor, indica perigo de falta durante a entrega. Fórmula: (Demanda × Lead Time) + Estoque de Segurança." align="center" />
                <ArrowUp v-if="sortState.column === 'ponto_reposicao' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'ponto_reposicao' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>

            <th class="px-3 py-2 text-right cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('ruptura')">
              <div class="flex items-center justify-end gap-1">
                <span>Ruptura</span>
                <InfoTooltip title="Dias até Ruptura" text="Tempo estimado que o estoque físico atual aguenta antes de zerar. Fórmula: Estoque Disponível ÷ Demanda Média Diária." align="center" />
                <ArrowUp v-if="sortState.column === 'ruptura' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'ruptura' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>

            <th class="px-3 py-2 text-right cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('sugestao')">
              <div class="flex items-center justify-end gap-1">
                <span>Comprar</span>
                <InfoTooltip title="Sugestão de Compra" text="Quantidade ideal sugerida para cobrir a demanda no Lead Time mais a Cobertura desejada, descontando o saldo atual e somando a segurança." align="center" />
                <ArrowUp v-if="sortState.column === 'sugestao' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'sugestao' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>

            <th class="px-3 py-2 text-right cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('capital')">
              <div class="flex items-center justify-end gap-1">
                <span>Capital</span>
                <InfoTooltip title="Capital de onde vem" text="Investimento financeiro necessário para adquirir o total sugerido na compra. Fórmula: Sugestão de Compra × Custo Unitário." align="center" />
                <ArrowUp v-if="sortState.column === 'capital' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'capital' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>

            <th class="px-3 py-2 text-right cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" @click="handleSort('risco')">
              <div class="flex items-center justify-end gap-1">
                <span>Risco</span>
                <InfoTooltip title="Faturamento em Risco" text="Perda de margem estimada caso ocorra ruptura antes da reposição chegar. Fórmula: Demanda média não atendida no lead time × Margem Unitária." align="right" />
                <ArrowUp v-if="sortState.column === 'risco' && sortState.direction === 'asc'" class="h-3.5 w-3.5 text-brand-500" />
                <ArrowDown v-else-if="sortState.column === 'risco' && sortState.direction === 'desc'" class="h-3.5 w-3.5 text-brand-500" />
              </div>
            </th>

            <th class="px-3 py-2 text-center select-none text-slate-400">
              <div class="flex items-center justify-center gap-1">
                <span>Classe</span>
                <InfoTooltip title="ABC / XYZ" text="ABC: importância no faturamento (A=80%, B=15%, C=5%). XYZ: regularidade e previsibilidade (X=estável, Z=muito instável/sazonal)." align="right" />
              </div>
            </th>

            <th class="px-3 py-2 text-center select-none text-slate-400">
              <div class="flex items-center justify-center gap-1">
                <span>Confiança</span>
                <InfoTooltip title="Grau de Confiança" text="Precisão estatística com base na regularidade e número de dias com venda do histórico." align="right" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.loading && !temItens">
            <td colspan="10" class="px-3 py-8 text-center text-slate-400 dark:text-slate-500">Calculando...</td>
          </tr>
          <tr v-else-if="!temItens">
            <td colspan="10" class="px-3 py-8 text-center text-slate-400 dark:text-slate-500 font-medium">Nenhum item precisa de compra agora. 🎉</td>
          </tr>
          <tr
            v-else
            v-for="row in sortedRows"
            :key="`${row.idempresa}-${row.idproduto}-${row.idsubproduto}`"
            class="border-b border-slate-100/50 last:border-0 hover:bg-slate-55/35 dark:border-slate-800/40 dark:hover:bg-slate-850/20 transition-colors cursor-pointer"
            @click="abrirDetalhe(row)"
          >
            <td class="px-3 py-1.5">
              <div class="font-bold text-slate-800 dark:text-slate-200 line-clamp-1" :title="row.descricao">{{ row.descricao }}</div>
              <div class="flex items-center gap-1.5 text-[10px] text-slate-450 dark:text-slate-500">
                <span>Emp. {{ row.idempresa }}</span>
                <span>·</span>
                <span>{{ row.idproduto }}/{{ row.idsubproduto }}</span>
                <span v-if="row.estoque_ausente" class="rounded bg-amber-100 px-1 font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">sem cadastro de estoque</span>
              </div>
            </td>
            
            <td class="px-3 py-1.5 text-right font-medium tabular-nums text-slate-700 dark:text-slate-350">
              {{ formatStockIntegrinNumber(row.saldo_disponivel, 0) }}
            </td>
            
            <td class="px-3 py-1.5 text-right font-medium tabular-nums text-slate-700 dark:text-slate-350">
              {{ formatStockIntegrinNumber(row.demanda_diaria, 1) }}
              <span v-if="row.tendencia_percent != null" class="ml-1 inline-flex items-center text-[10px]" :class="row.tendencia_percent >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                <TrendingUp v-if="row.tendencia_percent >= 0" class="h-3 w-3" />
                <TrendingDown v-else class="h-3 w-3" />
              </span>
            </td>
            
            <td class="px-3 py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
              {{ formatStockIntegrinNumber(row.ponto_reposicao, 0) }}
            </td>
            
            <td class="px-3 py-1.5 text-right font-semibold tabular-nums" :class="rupturaTone(row.dias_ate_ruptura)">
              {{ row.dias_ate_ruptura == null ? '—' : `${formatStockIntegrinNumber(row.dias_ate_ruptura, 1)}d` }}
            </td>
            
            <td class="px-3 py-1.5 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {{ formatStockIntegrinNumber(row.sugestao_compra, 0) }}
            </td>
            
            <td class="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-650 dark:text-slate-300">
              {{ moeda(row.capital_necessario) }}
            </td>
            
            <td class="px-3 py-1.5 text-right font-bold tabular-nums text-rose-600 dark:text-rose-455">
              {{ moeda(row.dinheiro_em_risco) }}
            </td>
            
            <td class="px-3 py-1.5 text-center">
              <span class="mr-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold" :class="abcTone[row.classe_abc]">{{ row.classe_abc }}</span>
              <span class="inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold" :class="xyzTone[row.classe_xyz]">{{ row.classe_xyz }}</span>
            </td>
            
            <td class="px-3 py-1.5 text-center text-[10px] font-bold capitalize" :class="confiancaTone[row.confianca]">
              {{ row.confianca }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <p class="px-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
      Comprar quando o estoque cruza o <strong>ponto de reposição</strong> = demanda diária × lead time + estoque de segurança
      (nível de serviço × variabilidade). Classe <strong>ABC</strong> = importância no faturamento; <strong>XYZ</strong> = previsibilidade da demanda.
    </p>
  </div>
</template>
