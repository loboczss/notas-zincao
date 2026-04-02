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
  <div class="glass-card w-full rounded-[2.5rem] border p-5 transition-all duration-300 dark:border-white/5 dark:bg-white/[0.02]">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Painel de Filtros</p>
        <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">Busque notas e aplique filtros de status e período.</p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-white/10 dark:bg-white/[0.03]">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Resultados</p>
        <p class="text-xs font-bold text-slate-700 dark:text-slate-200">Exibindo {{ props.resultCount }} de {{ props.totalCount }}</p>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section class="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
        <p class="mb-3 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Filtros principais</p>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1.1fr_1fr_1fr_auto] xl:items-end">
          <label class="space-y-1.5">
            <span class="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Buscar nota/cliente</span>
            <div class="relative group">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search class="h-4 w-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
              </div>
              <input
                :value="props.searchTerm"
                type="text"
                placeholder="Ex.: 000123, João, série 1"
                class="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition-all focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-slate-900"
                @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
                @keyup.enter="emit('apply')"
              >
            </div>
          </label>

          <label class="space-y-1.5">
            <span class="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Status da retirada</span>
            <div class="relative">
              <select
                :value="props.statusFilter"
                class="h-12 w-full appearance-none cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:[color-scheme:dark]"
                @change="emit('update:statusFilter', ($event.target as HTMLSelectElement).value as 'todos' | NotaRetiradaStatus)"
              >
                <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="todos">Todos Status</option>
                <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="pendente">Pendentes</option>
                <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="parcial">Retirada Parcial</option>
                <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="retirada">Concluídas</option>
                <option class="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100" value="cancelada">Canceladas</option>
              </select>
              <div class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </label>

          <label class="space-y-1.5">
            <span class="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Data inicial</span>
            <input
              :value="props.dataInicio"
              type="date"
              class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 outline-none transition-all focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
              @input="emit('update:dataInicio', ($event.target as HTMLInputElement).value)"
            >
          </label>

          <label class="space-y-1.5">
            <span class="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Data final</span>
            <input
              :value="props.dataFim"
              type="date"
              class="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 outline-none transition-all focus:border-brand-500/30 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
              @input="emit('update:dataFim', ($event.target as HTMLInputElement).value)"
            >
          </label>

          <div class="flex items-end sm:col-span-2 xl:col-span-1">
            <button
              type="button"
              class="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-amber-600 px-6 text-sm font-bold text-white transition-all hover:bg-amber-500 active:scale-95 disabled:opacity-50 xl:w-auto"
              :disabled="props.loading"
              @click="emit('apply')"
            >
              Filtrar
            </button>
          </div>
        </div>
      </section>

      <section class="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Ações e Exportação</p>
        <p class="mb-3 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Atualize a lista, exporte relatórios e aplique os filtros.</p>

        <div class="mt-auto flex flex-wrap items-center gap-2">
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
            class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            :disabled="!!props.exportLoading"
            title="Exportar CSV"
            @click="emit('export', 'csv')"
          >
            <Loader2 v-if="props.exportLoading === 'csv'" class="h-3.5 w-3.5 animate-spin" />
            <FileDown v-else class="h-3.5 w-3.5" />
            CSV
          </button>

          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            :disabled="!!props.exportLoading"
            title="Exportar PDF"
            @click="emit('export', 'pdf')"
          >
            <Loader2 v-if="props.exportLoading === 'pdf'" class="h-3.5 w-3.5 animate-spin" />
            <FileDown v-else class="h-3.5 w-3.5" />
            PDF
          </button>

        </div>
      </section>
    </div>
  </div>
</template>
