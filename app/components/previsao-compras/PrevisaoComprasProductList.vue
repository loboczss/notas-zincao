<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { HelpCircle } from 'lucide-vue-next'
import type { IntegrimProdutoValor } from '../../../shared/types/IntegrimNotas'
import PrevisaoComprasProductCard from './PrevisaoComprasProductCard.vue'
import PageEmptyState from '../PageEmptyState.vue'

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

// Se a lista mudar de tamanho e for menor/igual, ou vazia, reseta a ordenação cliente-side
watch(() => props.produtos, (newVal, oldVal) => {
  if (!newVal || !oldVal || newVal.length <= oldVal.length) {
    currentSortField.value = null
    currentSortDir.value = null
  }
}, { deep: false })
</script>

<template>
  <div class="space-y-4">
    <!-- Estado de Carregamento Inicial (Skeletons em formato de Tabela) -->
    <div v-if="props.loadingInitial" class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40" aria-busy="true">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
          <thead class="bg-slate-50 text-xs font-bold uppercase text-slate-400 dark:bg-slate-900/60 dark:text-slate-500">
            <tr>
              <th class="px-4 py-3">Produto / Identificação</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-right">Giro / Dia</th>
              <th class="px-4 py-3 text-right">Estoque</th>
              <th class="px-4 py-3 text-right">Cobertura</th>
              <th class="px-4 py-3 text-right">Comprar</th>
              <th class="px-4 py-3 text-right">IA</th>
              <th class="px-4 py-3 text-right">Faturamento</th>
              <th class="px-4 py-3 text-right">Lucro</th>
              <th class="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="i in 5" :key="i" class="animate-pulse">
              <td class="px-4 py-3.5">
                <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6 mb-1" />
                <div class="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </td>
              <td class="px-4 py-3.5"><div class="h-4.5 bg-slate-100 dark:bg-slate-800 rounded w-14 mx-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-10 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-5 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-5 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-10 ml-auto" /></td>
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

    <!-- Tabela Real de Dados -->
    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
          <thead class="bg-slate-50 text-xs font-bold uppercase text-slate-400 dark:bg-slate-900/60 dark:text-slate-500">
            <tr>
              <!-- Produto / Identificação -->
              <th
                class="px-4 py-3 cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('descricao')"
              >
                <div class="flex items-center gap-1.5">
                  <span>Produto / Identificação</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'descricao' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
                  >
                    {{ currentSortField === 'descricao' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Status -->
              <th
                class="px-4 py-3 text-center cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('status')"
              >
                <div class="flex items-center justify-center gap-1.5">
                  <span>Status</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'status' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
                  >
                    {{ currentSortField === 'status' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Giro / Dia -->
              <th
                class="px-4 py-3 text-right cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('giro_diario')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>Giro / Dia</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'giro_diario' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
                  >
                    {{ currentSortField === 'giro_diario' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Estoque -->
              <th
                class="px-4 py-3 text-right cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('saldo_disponivel')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>Estoque</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'saldo_disponivel' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
                  >
                    {{ currentSortField === 'saldo_disponivel' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Cobertura -->
              <th
                class="px-4 py-3 text-right cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('dias_cobertura')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>Cobertura</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'dias_cobertura' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
                  >
                    {{ currentSortField === 'dias_cobertura' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Comprar -->
              <th
                class="px-4 py-3 text-right cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('sugestao_compra')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>Comprar</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'sugestao_compra' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
                  >
                    {{ currentSortField === 'sugestao_compra' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- IA -->
              <th
                class="px-4 py-3 text-right cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('ai_oportunidade')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>IA</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'ai_oportunidade' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
                  >
                    {{ currentSortField === 'ai_oportunidade' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Faturamento -->
              <th
                class="px-4 py-3 text-right cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('faturamento_periodo')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>Faturamento</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'faturamento_periodo' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
                  >
                    {{ currentSortField === 'faturamento_periodo' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Lucro -->
              <th
                class="px-4 py-3 text-right cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('margem_periodo')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>Lucro</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'margem_periodo' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
                  >
                    {{ currentSortField === 'margem_periodo' ? (currentSortDir === 'asc' ? '▲' : '▼') : '↕' }}
                  </span>
                </div>
              </th>

              <!-- Score -->
              <th
                class="px-4 py-3 text-right cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                @click="toggleSort('score_valor')"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span>Score</span>
                  <span
                    class="text-[9px] transition-colors"
                    :class="currentSortField === 'score_valor' ? 'text-brand-500 dark:text-brand-400 font-extrabold' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-450'"
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
