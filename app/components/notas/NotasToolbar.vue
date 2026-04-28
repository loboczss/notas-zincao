<script setup lang="ts">
import { Search, RotateCw, FileDown, Loader2 } from 'lucide-vue-next'
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
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Filtros</h2>
        </div>
        <div class="text-xs text-slate-500">
          Resultados: <span class="font-medium text-slate-900 dark:text-white">{{ props.resultCount }}</span> de {{ props.totalCount }}
        </div>
      </div>

      <div class="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div class="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Campo de Busca -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Buscar</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search class="h-4 w-4 text-slate-400" />
              </div>
              <input
                :value="props.searchTerm"
                type="text"
                placeholder="Nome, número ou série..."
                class="block w-full rounded-md border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
                @keyup.enter="emit('apply')"
              >
            </div>
          </div>

          <!-- Status da Retirada -->
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
                <option value="retirada">Concluídas</option>
                <option value="cancelada">Canceladas</option>
              </select>
              <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <!-- Período Início -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Data Inicial</label>
            <input
              :value="props.dataInicio"
              type="date"
              class="block w-full rounded-md border border-slate-200 bg-white py-1.5 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
              @input="emit('update:dataInicio', ($event.target as HTMLInputElement).value)"
            >
          </div>

          <!-- Período Fim -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Data Final</label>
            <input
              :value="props.dataFim"
              type="date"
              class="block w-full rounded-md border border-slate-200 bg-white py-1.5 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
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
          
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              :disabled="props.loading"
              @click="emit('refresh')"
              title="Atualizar"
            >
              <RotateCw class="h-4 w-4" :class="props.loading ? 'animate-spin' : ''" />
            </button>

            <div class="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            <button
              type="button"
              class="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              :disabled="!!props.exportLoading"
              @click="emit('export', 'csv')"
            >
              <Loader2 v-if="props.exportLoading === 'csv'" class="h-4 w-4 animate-spin" />
              <FileDown v-else class="h-4 w-4" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              class="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
    </div>
  </div>
</template>
