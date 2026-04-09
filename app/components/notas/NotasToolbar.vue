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
  <div class="group/toolbar w-full rounded-[2.5rem] border border-white/40 bg-white/60 p-6 backdrop-blur-md transition-all duration-500 hover:shadow-2xl hover:shadow-brand-500/10 dark:border-white/5 dark:bg-white/[0.02] dark:hover:shadow-none">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-xs font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">Painel de Filtros</h2>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Refine sua busca por notas e clientes</p>
      </div>

      <div class="flex items-center gap-3 rounded-2xl bg-white/50 px-4 py-2.5 shadow-sm ring-1 ring-slate-200/50 dark:bg-white/5 dark:ring-white/10">
        <div class="flex flex-col text-right">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Resultados</span>
          <p class="text-sm font-bold text-slate-700 dark:text-slate-200">
            {{ props.resultCount }} <span class="text-slate-400 font-medium">de</span> {{ props.totalCount }}
          </p>
        </div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1fr_390px]">
      <section class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.5fr_1.2fr_1.8fr_auto] xl:items-end">
          <!-- Campo de Busca -->
          <div class="flex flex-col gap-2">
            <label class="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Buscar nota/cliente</label>
            <div class="relative group/input">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search class="h-4 w-4 text-slate-400 transition-colors group-focus-within/input:text-brand-500" />
              </div>
              <input
                :value="props.searchTerm"
                type="text"
                placeholder="Nome, número ou série..."
                class="h-12 w-full rounded-2xl border border-slate-200/60 bg-white px-4 pl-11 text-sm font-medium shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-slate-900"
                @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
                @keyup.enter="emit('apply')"
              >
            </div>
          </div>

          <!-- Status da Retirada -->
          <div class="flex flex-col gap-2">
            <label class="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status da retirada</label>
            <div class="relative">
              <select
                :value="props.statusFilter"
                class="h-12 w-full appearance-none cursor-pointer rounded-2xl border border-slate-200/60 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm outline-none transition-all focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]"
                @change="emit('update:statusFilter', ($event.target as HTMLSelectElement).value as 'todos' | NotaRetiradaStatus)"
              >
                <option value="todos">Todos Status</option>
                <option value="pendente">Pendentes</option>
                <option value="parcial">Parciais</option>
                <option value="retirada">Concluídas</option>
                <option value="cancelada">Canceladas</option>
              </select>
              <div class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <!-- Agrupamento de Datas (Período) -->
          <div class="flex flex-col gap-2">
            <label class="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Período</label>
            <div class="flex h-12 items-center divide-x divide-slate-200 overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm focus-within:border-brand-500/50 focus-within:ring-4 focus-within:ring-brand-500/10 dark:divide-white/10 dark:border-white/10 dark:bg-slate-900">
              <input
                :value="props.dataInicio"
                type="date"
                class="w-full bg-transparent px-3 text-[11px] font-bold text-slate-600 outline-none dark:text-slate-300 dark:[color-scheme:dark]"
                title="Data Inicial"
                @input="emit('update:dataInicio', ($event.target as HTMLInputElement).value)"
              >
              <div class="flex items-center px-1 text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>
              </div>
              <input
                :value="props.dataFim"
                type="date"
                class="w-full bg-transparent px-3 text-[11px] font-bold text-slate-600 outline-none dark:text-slate-300 dark:[color-scheme:dark]"
                title="Data Final"
                @input="emit('update:dataFim', ($event.target as HTMLInputElement).value)"
              >
            </div>
          </div>

          <!-- Botão Filtrar -->
          <button
            type="button"
            class="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 px-8 text-sm font-black text-white shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] hover:shadow-brand-500/40 active:scale-95 disabled:opacity-50"
            :disabled="props.loading"
            @click="emit('apply')"
          >
            <Loader2 v-if="props.loading" class="mr-2 h-4 w-4 animate-spin" />
            Filtrar
          </button>
        </div>
      </section>

      <!-- Ações e Exportação -->
      <section class="flex flex-col justify-end gap-3 rounded-[2rem] bg-white/40 p-4 ring-1 ring-slate-200/50 dark:bg-white/[0.03] dark:ring-white/10">
        <div class="flex items-center justify-between gap-2 border-b border-slate-200/50 pb-2 dark:border-white/5">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Ações rápidas</span>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 active:scale-90 dark:bg-white/5 dark:ring-white/10"
            :disabled="props.loading"
            @click="emit('refresh')"
          >
            <RotateCw class="h-3.5 w-3.5 text-slate-500" :class="props.loading ? 'animate-spin' : ''" />
          </button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="group flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-brand-600 active:scale-95 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10"
            :disabled="!!props.exportLoading"
            @click="emit('export', 'csv')"
          >
            <Loader2 v-if="props.exportLoading === 'csv'" class="h-3.5 w-3.5 animate-spin" />
            <FileDown v-else class="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
            CSV
          </button>

          <button
            type="button"
            class="group flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-brand-600 active:scale-95 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10"
            :disabled="!!props.exportLoading"
            @click="emit('export', 'pdf')"
          >
            <Loader2 v-if="props.exportLoading === 'pdf'" class="h-3.5 w-3.5 animate-spin" />
            <FileDown v-else class="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
            PDF
          </button>
        </div>
      </section>
    </div>
  </div>

</template>
