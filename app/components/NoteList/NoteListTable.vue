<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteManagement } from '../../composables/useNoteManagement'
import Input from '../Input.vue'
import type { NotaRetiradaListItem } from '../../../shared/types/NotasRetirada'

const { fetchNotas } = useNoteManagement()

const search = ref('')
const filter = ref('Todos')
const loading = ref(true)
const notas = ref<NotaRetiradaListItem[]>([])

const load = async () => {
  loading.value = true
  notas.value = await fetchNotas() || []
  loading.value = false
}

load()

const filteredNotas = computed(() => {
  let result = notas.value
  
  if (filter.value !== 'Todos') {
    result = result.filter(n => n.status_retirada === filter.value.toLowerCase())
  }
  
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(n => 
      n.nome_cliente.toLowerCase().includes(s) || 
      n.numero_nota.toLowerCase().includes(s)
    )
  }
  
  return result
})

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pendente': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
    case 'retirado': return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
    case 'parcial': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
    case 'cancelado': return 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
    default: return 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700'
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Search & Filter Chips -->
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="relative w-full md:max-w-md">
        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input 
          v-model="search"
          type="text"
          placeholder="Buscar por cliente ou nota..."
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
        />
      </div>

      <div class="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
        <button 
          v-for="f in ['Todos', 'Pendentes', 'Parciais', 'Retirados', 'Cancelados']" 
          :key="f"
          @click="filter = f"
          :class="[
            'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition duration-200',
            filter === f 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-indigo-950/50' 
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
          ]"
        >
          {{ f }}
        </button>
      </div>
    </div>

    <!-- Data Table -->
    <div class="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50/50 dark:bg-slate-800/50">
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nota #</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cliente</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor Total</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
            <th class="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading" v-for="i in 5" :key="i" class="animate-pulse">
            <td colspan="6" class="px-6 py-4"><div class="h-4 w-full rounded bg-slate-100"></div></td>
          </tr>
          
          <tr v-else-if="filteredNotas.length === 0">
            <td colspan="6" class="px-6 py-12 text-center text-slate-400 dark:text-slate-600">
              Nenhuma nota encontrada.
            </td>
          </tr>

          <tr 
            v-for="nota in filteredNotas" 
            :key="nota.id"
            class="group transition hover:bg-indigo-50/30"
          >
            <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{{ formatDate(nota.data_compra) }}</td>
            <td class="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">#NF-{{ nota.numero_nota || '---' }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                  {{ nota.nome_cliente.charAt(0) }}
                </div>
                <span class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ nota.nome_cliente }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              R$ {{ (nota.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
            </td>
            <td class="px-6 py-4">
              <span :class="['inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold leading-none', getStatusColor(nota.status_retirada)]">
                {{ nota.status_retirada }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button class="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
                <button class="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Pagination Strategy: Minimalistic -->
      <footer class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 px-6 py-4">
        <span class="text-xs text-slate-500 dark:text-slate-400">Mostrando {{ filteredNotas.length }} de {{ notas.length }} notas</span>
        <div class="flex items-center gap-1">
          <button class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition disabled:opacity-50" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button class="h-8 w-8 rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-sm">1</button>
          <button class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
