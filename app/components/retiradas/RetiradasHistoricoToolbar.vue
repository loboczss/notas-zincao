<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Calendar,
  ChevronDown,
  Clock,
  FileDown,
  Filter,
  Loader2,
  RotateCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-vue-next'
import type {
  RetiradaHistoricoFiltros,
  RetiradaHistoricoResumo,
  RetiradaHistoricoSortKey,
  RetiradaHistoricoSortOption,
  RetiradaHistoricoSortOrder,
} from '../../../shared/types/RetiradasHistorico'
import { formatRetiradaNumber } from '../../utils/retiradas-historico'

type ExportFormat = 'csv' | 'pdf'

const props = withDefaults(defineProps<{
  inicio: number
  fim: number
  total: number
  loading: boolean
  sortKey: RetiradaHistoricoSortKey
  sortOrder: RetiradaHistoricoSortOrder
  sortOptions: RetiradaHistoricoSortOption[]
  sortDescription: string
  filtros: RetiradaHistoricoFiltros
  resumo: RetiradaHistoricoResumo
  hasActiveFilters: boolean
  exportLoading?: ExportFormat | false
}>(), {
  exportLoading: false,
})

const emit = defineEmits<{
  (e: 'update:filtros', value: RetiradaHistoricoFiltros): void
  (e: 'update-sort', value: { key: RetiradaHistoricoSortKey; order: RetiradaHistoricoSortOrder }): void
  (e: 'apply'): void
  (e: 'clear'): void
  (e: 'refresh'): void
  (e: 'export', format: ExportFormat): void
}>()

const filtersOpen = ref(false)

const updateFilter = (key: keyof RetiradaHistoricoFiltros, value: string) => {
  emit('update:filtros', {
    ...props.filtros,
    [key]: value,
  })
}

const updateSortKey = (value: string) => {
  emit('update-sort', {
    key: value as RetiradaHistoricoSortKey,
    order: props.sortOrder,
  })
}

const updateSortOrder = (value: string) => {
  emit('update-sort', {
    key: props.sortKey,
    order: value as RetiradaHistoricoSortOrder,
  })
}

const resumoItems = computed(() => [
  {
    label: 'Registros',
    value: formatRetiradaNumber(props.resumo.eventos),
  },
  {
    label: 'Unidades',
    value: formatRetiradaNumber(props.resumo.quantidade_total),
  },
  {
    label: 'Itens',
    value: formatRetiradaNumber(props.resumo.itens),
  },
  {
    label: 'Zinco',
    value: `${formatRetiradaNumber(props.resumo.reducao_zinco_10)} m2`,
  },
])

const advancedFiltersCount = computed(() => {
  return [
    props.filtros.data_inicio,
    props.filtros.data_fim,
    props.filtros.hora_inicio,
    props.filtros.hora_fim,
  ].filter(Boolean).length
})
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div class="space-y-5 p-4 sm:p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-base font-bold text-slate-950 dark:text-white">
              Retiradas registradas
            </h2>
            <span
              v-if="hasActiveFilters"
              class="inline-flex h-6 items-center gap-1 rounded-md bg-brand-50 px-2 text-[11px] font-semibold uppercase text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
            >
              <Filter class="h-3 w-3" />
              Filtrado
            </span>
          </div>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ inicio }}-{{ fim }} de {{ total }} registros
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            :disabled="loading"
            title="Atualizar"
            @click="emit('refresh')"
          >
            <RotateCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
            <span>Atualizar</span>
          </button>

          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              :disabled="!!exportLoading"
              @click="emit('export', 'csv')"
            >
              <Loader2 v-if="exportLoading === 'csv'" class="h-4 w-4 animate-spin" />
              <FileDown v-else class="h-4 w-4" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              :disabled="!!exportLoading"
              @click="emit('export', 'pdf')"
            >
              <Loader2 v-if="exportLoading === 'pdf'" class="h-4 w-4 animate-spin" />
              <FileDown v-else class="h-4 w-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-sm dark:border-slate-800 dark:bg-slate-800 md:grid-cols-4">
        <div
          v-for="item in resumoItems"
          :key="item.label"
          class="min-w-0 bg-slate-50 px-3 py-3 dark:bg-slate-950/40"
        >
          <p class="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
            {{ item.label }}
          </p>
          <p class="mt-1 truncate text-base font-bold text-slate-950 dark:text-white">
            {{ item.value }}
          </p>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
          <Filter class="h-4 w-4 text-brand-600 dark:text-brand-300" />
          <p class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
            Filtros
          </p>
        </div>

        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label class="block min-w-0">
            <span class="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Buscar</span>
            <span class="relative block">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                :value="filtros.search"
                type="search"
                placeholder="Cliente, nota, produto..."
                class="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                @input="updateFilter('search', ($event.target as HTMLInputElement).value)"
                @keyup.enter="emit('apply')"
              >
            </span>
          </label>

          <div class="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading"
              @click="emit('apply')"
            >
              <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
              <Filter v-else class="h-4 w-4" />
              <span>Filtrar</span>
            </button>

            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              :class="filtersOpen || advancedFiltersCount ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
              :aria-expanded="filtersOpen"
              aria-controls="retiradas-filtros-avancados"
              :disabled="loading"
              @click="filtersOpen = !filtersOpen"
            >
              <SlidersHorizontal class="h-4 w-4" />
              <span>{{ filtersOpen ? 'Ocultar' : 'Mais filtros' }}</span>
              <span
                v-if="advancedFiltersCount"
                class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white dark:bg-brand-400 dark:text-slate-950"
              >
                {{ advancedFiltersCount }}
              </span>
              <ChevronDown class="h-4 w-4 transition-transform" :class="{ 'rotate-180': filtersOpen }" />
            </button>

            <button
              type="button"
              class="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:col-span-1"
              :disabled="loading || !hasActiveFilters"
              @click="emit('clear')"
            >
              <X class="h-4 w-4" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="-translate-y-1 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-1 opacity-0"
        >
          <div
            v-if="filtersOpen"
            id="retiradas-filtros-avancados"
            class="border-t border-slate-100 pt-4 dark:border-slate-800"
          >
            <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div class="min-w-0 space-y-3">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label class="block min-w-0">
                    <span class="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Dia</span>
                    <span class="relative block">
                      <Calendar class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        :value="filtros.data_inicio"
                        type="date"
                        class="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                        @input="updateFilter('data_inicio', ($event.target as HTMLInputElement).value)"
                      >
                    </span>
                  </label>

                  <label class="block min-w-0">
                    <span class="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Ate</span>
                    <span class="relative block">
                      <Calendar class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        :value="filtros.data_fim"
                        type="date"
                        class="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                        @input="updateFilter('data_fim', ($event.target as HTMLInputElement).value)"
                      >
                    </span>
                  </label>

                  <label class="block min-w-0">
                    <span class="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Hora inicial</span>
                    <span class="relative block">
                      <Clock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        :value="filtros.hora_inicio"
                        type="time"
                        class="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                        @input="updateFilter('hora_inicio', ($event.target as HTMLInputElement).value)"
                      >
                    </span>
                  </label>

                  <label class="block min-w-0">
                    <span class="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Hora final</span>
                    <span class="relative block">
                      <Clock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        :value="filtros.hora_fim"
                        type="time"
                        class="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                        @input="updateFilter('hora_fim', ($event.target as HTMLInputElement).value)"
                      >
                    </span>
                  </label>
                </div>
              </div>

              <div class="min-w-0 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                <div class="flex items-center gap-2">
                  <SlidersHorizontal class="h-4 w-4 text-brand-600 dark:text-brand-300" />
                  <p class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                    Ordenacao
                  </p>
                </div>

                <label class="block">
                  <span class="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Campo</span>
                  <span class="relative block">
                    <select
                      :value="sortKey"
                      class="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                      :disabled="loading"
                      @change="updateSortKey(($event.target as HTMLSelectElement).value)"
                    >
                      <option
                        v-for="option in sortOptions"
                        :key="option.key"
                        :value="option.key"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </span>
                </label>

                <label class="block">
                  <span class="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Direcao</span>
                  <span class="relative block">
                    <select
                      :value="sortOrder"
                      class="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                      :disabled="loading"
                      @change="updateSortOrder(($event.target as HTMLSelectElement).value)"
                    >
                      <option value="desc">Decrescente</option>
                      <option value="asc">Crescente</option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </span>
                </label>

                <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {{ sortDescription }}
                </p>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>
