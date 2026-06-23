<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AlertTriangle,
  Check,
  ExternalLink,
  EyeOff,
  Sparkles,
  ShoppingBag,
} from 'lucide-vue-next'
import type {
  IntegrimCompraAiOportunidade,
  IntegrimCompraEventoTipo,
  IntegrimCompraOportunidadeStatus,
} from '../../../../shared/types/IntegrimNotas'
import { formatStockIntegrinNumber } from '../../../utils/stock-integrin-format'

const props = withDefaults(defineProps<{
  oportunidades: IntegrimCompraAiOportunidade[]
  isAdmin?: boolean
  actionLoading?: boolean
}>(), {
  isAdmin: false,
  actionLoading: false,
})

const emit = defineEmits<{
  (e: 'opportunityAction', input: {
    id: string
    status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>
  }): void
}>()

// Filtro de status local
const currentFilter = ref<'todas' | IntegrimCompraOportunidadeStatus>('nova')

const filteredOportunidades = computed(() => {
  if (currentFilter.value === 'todas') {
    return props.oportunidades
  }
  return props.oportunidades.filter(item => item.status === currentFilter.value)
})

const eventTypeLabels: Record<IntegrimCompraEventoTipo, string> = {
  clima: 'Clima',
  cidade: 'Cidade',
  esporte: 'Esporte',
  feriado: 'Feriado',
  obra: 'Obra',
  tendencia: 'Tendência',
  fornecedor: 'Fornecedor',
}

const statusLabels: Record<IntegrimCompraOportunidadeStatus, string> = {
  nova: 'Nova',
  aceita: 'Aceita',
  ignorada: 'Ignorada',
  comprada: 'Comprada',
  expirada: 'Expirada',
}

const statusBadgeClass = (status: IntegrimCompraOportunidadeStatus) => {
  if (status === 'aceita') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800/40'
  }
  if (status === 'comprada') {
    return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-800/40'
  }
  if (status === 'ignorada') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800/40'
  }
  if (status === 'expirada') {
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
  }
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800/40'
}

const sourceUrl = (source: unknown) => {
  if (!source || typeof source !== 'object') return ''
  return String((source as { url?: unknown }).url || '').trim()
}

const sourceTitle = (source: unknown) => {
  if (!source || typeof source !== 'object') return 'Fonte externa'
  return String((source as { title?: unknown }).title || 'Fonte externa').trim()
}

const formatConfidence = (value: number) =>
  `${formatStockIntegrinNumber(Number(value || 0) * 100, 0)}%`
</script>

<template>
  <div class="space-y-4">
    <!-- Header e Filtros -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-base font-bold text-slate-950 dark:text-slate-50 flex items-center gap-2">
          <Sparkles class="h-4.5 w-4.5 text-violet-500" />
          Oportunidades de IA
        </h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">Sugestões de compras extras baseadas em eventos externos.</p>
      </div>

      <!-- Filtros de Status (Pills Minimalistas) -->
      <div class="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
        <button
          v-for="filter in ['nova', 'aceita', 'comprada', 'ignorada', 'todas'] as const"
          :key="filter"
          type="button"
          class="rounded px-2.5 py-1 text-xs font-bold transition-all uppercase tracking-wide"
          :class="currentFilter === filter
            ? 'bg-slate-950 text-white shadow-sm dark:bg-slate-800 dark:text-white'
            : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-200'"
          @click="currentFilter = filter"
        >
          {{ filter === 'todas' ? 'Todas' : statusLabels[filter] }}
        </button>
      </div>
    </div>

    <!-- Lista / Grid de Cards -->
    <div v-if="!filteredOportunidades.length" class="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/10 dark:text-slate-400">
      Nenhuma oportunidade encontrada com o status selecionado.
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      <div
        v-for="oportunidade in filteredOportunidades"
        :key="oportunidade.id"
        class="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-slate-900/40"
        :class="[
          oportunidade.status === 'aceita' ? 'border-emerald-500/20 shadow-emerald-500/5' : 
          oportunidade.status === 'comprada' ? 'border-sky-500/20 shadow-sky-500/5' :
          oportunidade.status === 'ignorada' ? 'border-rose-500/20 shadow-rose-500/5' :
          'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        ]"
      >
        <div>
          <!-- Cabeçalho do Card (Produto e Status) -->
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate text-sm font-bold text-slate-900 dark:text-slate-50" :title="oportunidade.descricao || ''">
                {{ oportunidade.descricao || 'Produto sem descrição' }}
              </h3>
              <p class="mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                Empresa {{ oportunidade.idempresa }} • Cód. {{ oportunidade.idproduto }}/{{ oportunidade.idsubproduto }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-1.5">
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-bold" :class="statusBadgeClass(oportunidade.status)">
                {{ statusLabels[oportunidade.status] }}
              </span>
            </div>
          </div>

          <!-- Destaque de Recomendação IA -->
          <div class="mt-4 rounded-lg bg-violet-50/40 border border-violet-100/50 p-3 dark:bg-violet-950/10 dark:border-violet-900/30 flex items-center justify-between gap-4">
            <div class="min-w-0">
              <span class="block text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Compra Extra Sugerida</span>
              <span class="mt-1 block text-lg font-black text-violet-900 dark:text-violet-200">
                +{{ formatStockIntegrinNumber(oportunidade.compra_extra, 0) }} <span class="text-xs font-semibold text-violet-600 dark:text-violet-400">unidades</span>
              </span>
            </div>
            <div class="text-right shrink-0">
              <span class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Confiança IA</span>
              <span class="mt-1 block text-sm font-bold text-slate-700 dark:text-slate-300">
                {{ formatConfidence(oportunidade.confidence) }}
              </span>
            </div>
          </div>

          <!-- Motivo / Justificativa da IA -->
          <div class="mt-3.5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p class="leading-relaxed">
              <span class="font-bold text-slate-800 dark:text-slate-200">Motivo:</span> {{ oportunidade.motivo }}
            </p>

            <!-- Alerta Contra-argumento -->
            <div v-if="oportunidade.contra_argumento" class="flex gap-2 rounded-lg bg-amber-50/50 border border-amber-100 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-950/10 dark:border-amber-900/20 dark:text-amber-300">
              <AlertTriangle class="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span class="leading-normal"><span class="font-bold">Contraponto:</span> {{ oportunidade.contra_argumento }}</span>
            </div>
          </div>

          <!-- Evento IA Vinculado -->
          <div v-if="oportunidade.evento_titulo" class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
            <span v-if="oportunidade.evento_tipo" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase tracking-wider">
              {{ eventTypeLabels[oportunidade.evento_tipo] }}
            </span>
            <span class="font-medium text-slate-500 dark:text-slate-400 truncate max-w-[200px]" :title="oportunidade.evento_titulo">
              {{ oportunidade.evento_titulo }}
            </span>
          </div>
        </div>

        <!-- Rodapé de Ações / Links -->
        <div class="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <!-- Link de Fonte -->
          <div class="min-w-0">
            <a
              v-if="oportunidade.fontes.length && sourceUrl(oportunidade.fontes[0])"
              class="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-500 hover:underline dark:text-brand-400 truncate max-w-full"
              :href="sourceUrl(oportunidade.fontes[0])"
              target="_blank"
              rel="noreferrer"
            >
              {{ sourceTitle(oportunidade.fontes[0]) }}
              <ExternalLink class="h-3 w-3 shrink-0" />
            </a>
          </div>

          <!-- Ações do Administrador -->
          <div v-if="props.isAdmin" class="flex flex-wrap sm:flex-nowrap gap-1.5 w-full sm:w-auto justify-end">
            <!-- Aceitar -->
            <button
              v-if="oportunidade.status === 'nova'"
              type="button"
              class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-40 dark:text-emerald-300 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
              :disabled="props.actionLoading"
              @click="emit('opportunityAction', { id: oportunidade.id, status: 'aceita' })"
            >
              <Check class="h-3.5 w-3.5" />
              <span>Aceitar</span>
            </button>

            <!-- Ignorar -->
            <button
              v-if="oportunidade.status === 'nova' || oportunidade.status === 'aceita'"
              type="button"
              class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-40 dark:text-rose-300 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
              :disabled="props.actionLoading"
              @click="emit('opportunityAction', { id: oportunidade.id, status: 'ignorada' })"
            >
              <EyeOff class="h-3.5 w-3.5" />
              <span>Ignorar</span>
            </button>

            <!-- Marcar comprado -->
            <button
              v-if="oportunidade.status === 'nova' || oportunidade.status === 'aceita'"
              type="button"
              class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-40 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750"
              :disabled="props.actionLoading"
              @click="emit('opportunityAction', { id: oportunidade.id, status: 'comprada' })"
            >
              <ShoppingBag class="h-3.5 w-3.5" />
              <span>Comprado</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
