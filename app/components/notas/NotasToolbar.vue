<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, FileDown, Loader2, RotateCw, Search, SlidersHorizontal } from 'lucide-vue-next'
import type { NotaRetiradaStatus } from '../../../shared/types/NotasRetirada'

const props = withDefaults(defineProps<{
  searchTerm: string
  statusFilter: 'todos' | NotaRetiradaStatus
  dataInicio: string
  dataFim: string
  totalCount: number
  resultCount: number
  loading?: boolean
  exportLoading?: 'csv' | 'pdf' | false
}>(), {
  loading: false,
  exportLoading: false,
})

const emit = defineEmits<{
  (e: 'update:searchTerm', value: string): void
  (e: 'update:statusFilter', value: 'todos' | NotaRetiradaStatus): void
  (e: 'update:dataInicio', value: string): void
  (e: 'update:dataFim', value: string): void
  (e: 'apply'): void
  (e: 'refresh'): void
  (e: 'export', format: 'csv' | 'pdf'): void
}>()

const advancedOpen = ref(false)

const hasAdvancedFilters = computed(() => {
  return props.statusFilter !== 'todos'
    || Boolean(props.dataInicio)
    || Boolean(props.dataFim)
})
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Filtros</h2>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-xs text-slate-500">
            Resultados:
            <span class="font-medium text-slate-900 dark:text-white">{{ props.resultCount }}</span>
            de {{ props.totalCount }}
          </div>

          <button
            type="button"
            class="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            :class="hasAdvancedFilters ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300' : ''"
            aria-controls="notas-filtros-avancados"
            :aria-expanded="advancedOpen"
            @click="advancedOpen = !advancedOpen"
          >
            <SlidersHorizontal class="h-3.5 w-3.5" />
            <span>{{ advancedOpen ? 'Ocultar' : 'Mais filtros' }}</span>
            <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': advancedOpen }" />
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Buscar</label>
        <div class="relative">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search class="h-4 w-4 text-slate-400" />
          </div>
          <input
            :value="props.searchTerm"
            type="text"
            placeholder="Nome, numero ou serie..."
            class="block w-full rounded-md border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
            @keyup.enter="emit('apply')"
          >
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
        <div v-if="advancedOpen" id="notas-filtros-avancados" class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
              <div class="relative">
                <select
                  :value="props.statusFilter"
                  class="block w-full appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                  @change="emit('update:statusFilter', ($event.target as HTMLSelectElement).value as 'todos' | NotaRetiradaStatus)"
                >
                  <option value="todos">Todos Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="parcial">Parciais</option>
                  <option value="retirada">Concluidas</option>
                  <option value="cancelada">Canceladas</option>
                </select>
                <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <ChevronDown class="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Data Inicial</label>
              <input
                :value="props.dataInicio"
                type="date"
                class="block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                @input="emit('update:dataInicio', ($event.target as HTMLInputElement).value)"
              >
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Data Final</label>
              <input
                :value="props.dataFim"
                type="date"
                class="block w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
                @input="emit('update:dataFim', ($event.target as HTMLInputElement).value)"
              >
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 lg:flex-nowrap">
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-500 active:bg-brand-700 disabled:opacity-50 lg:flex-none"
              :disabled="props.loading"
              @click="emit('apply')"
            >
              <Loader2 v-if="props.loading" class="h-4 w-4 animate-spin" />
              <span>Filtrar</span>
            </button>

            <div class="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                :disabled="props.loading"
                title="Atualizar"
                @click="emit('refresh')"
              >
                <RotateCw class="h-4 w-4" :class="props.loading ? 'animate-spin' : ''" />
              </button>

              <div class="hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:flex-none"
                :disabled="!!props.exportLoading"
                @click="emit('export', 'csv')"
              >
                <Loader2 v-if="props.exportLoading === 'csv'" class="h-4 w-4 animate-spin" />
                <FileDown v-else class="h-4 w-4" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:flex-none"
                :disabled="!!props.exportLoading"
                @click="emit('export', 'pdf')"
              >
                <Loader2 v-if="props.exportLoading === 'pdf'" class="h-4 w-4 animate-spin" />
                <FileDown v-else class="h-4 w-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
