<script setup lang="ts">
import { Search, RotateCw } from 'lucide-vue-next'
import type { NotaRetiradaStatus } from '../../../shared/types/NotasRetirada'

const props = withDefaults(defineProps<{
  searchTerm: string
  statusFilter: 'todos' | NotaRetiradaStatus
  dataInicio: string
  dataFim: string
  totalCount: number
  resultCount: number
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:searchTerm', value: string): void
  (e: 'update:statusFilter', value: 'todos' | NotaRetiradaStatus): void
  (e: 'update:dataInicio', value: string): void
  (e: 'update:dataFim', value: string): void
  (e: 'apply'): void
  (e: 'refresh'): void
}>()
</script>

<template>
  <div class="glass-card flex w-full flex-col gap-4 rounded-[2.5rem] border p-4 transition-all duration-300 dark:border-white/5 dark:bg-white/[0.02] lg:flex-row lg:items-center lg:justify-between">
    <div class="grid w-full gap-4 lg:grid-cols-[2fr_180px_140px_140px] lg:items-center">
      <!-- Busca (Aumentado) -->
      <div class="relative group">
        <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search class="h-4 w-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
        </div>
        <input
          :value="props.searchTerm"
          type="text"
          placeholder="Pesquisar por nota, série ou cliente..."
          class="w-full h-12 bg-slate-50 dark:bg-white/[0.03] border-none rounded-2xl pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none"
          @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('apply')"
        >
      </div>

      <!-- Status -->
      <div class="relative">
        <select
          :value="props.statusFilter"
          class="w-full h-12 bg-slate-50 dark:bg-white/[0.03] border-none rounded-2xl px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500/20 transition-all appearance-none cursor-pointer outline-none"
          @change="emit('update:statusFilter', ($event.target as HTMLSelectElement).value as 'todos' | NotaRetiradaStatus)"
        >
          <option value="todos">Todos Status</option>
          <option value="pendente">Pendentes</option>
          <option value="parcial">Retirada Parcial</option>
          <option value="retirada">Concluídas</option>
          <option value="cancelada">Canceladas</option>
        </select>
        <div class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      <!-- Data Início -->
      <div class="relative">
        <input
          :value="props.dataInicio"
          type="date"
          class="w-full h-12 bg-slate-50 dark:bg-white/[0.03] border-none rounded-2xl px-4 text-xs font-bold text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer outline-none"
          @input="emit('update:dataInicio', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <!-- Data Fim -->
      <div class="relative">
        <input
          :value="props.dataFim"
          type="date"
          class="w-full h-12 bg-slate-50 dark:bg-white/[0.03] border-none rounded-2xl px-4 text-xs font-bold text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer outline-none"
          @input="emit('update:dataFim', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <div class="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 lg:border-none lg:pt-0">
      <div class="flex flex-col">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Resultados</span>
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ props.resultCount }} / {{ props.totalCount }}</span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-900 active:scale-95 disabled:opacity-50 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          :disabled="props.loading"
          title="Atualizar"
          @click="emit('refresh')"
        >
          <RotateCw class="h-4 w-4" :class="props.loading ? 'animate-spin' : ''" />
        </button>

        <button
          type="button"
          class="inline-flex h-10 items-center justify-center rounded-xl bg-amber-600 px-6 text-xs font-bold text-white transition-all hover:bg-amber-500 active:scale-95 disabled:opacity-50"
          :disabled="props.loading"
          @click="emit('apply')"
        >
          Filtrar
        </button>
      </div>
    </div>
  </div>
</template>
