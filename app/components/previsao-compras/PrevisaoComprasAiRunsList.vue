<script setup lang="ts">
import { Clock3 } from 'lucide-vue-next'
import type { IntegrimCompraAiTaskRun } from '../../../shared/types/IntegrimNotas'
import { formatStockIntegrinDate } from '../../utils/stock-integrin-format'
import Card from '../Card.vue'

const props = defineProps<{
  runs: IntegrimCompraAiTaskRun[]
}>()

const statusLabel = (status: string | null) => {
  if (status === 'running') return 'Rodando'
  if (status === 'success') return 'Sucesso'
  if (status === 'failed') return 'Falha'
  return 'Inativo'
}

const statusClass = (status: string | null) => {
  if (status === 'success') {
    return 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-550/10 dark:text-emerald-300'
  }
  if (status === 'running') {
    return 'border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-550/10 dark:text-sky-300'
  }
  if (status === 'failed') {
    return 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-550/10 dark:text-rose-350'
  }
  return 'border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-400'
}
</script>

<template>
  <Card padding-class="p-0" class="overflow-hidden">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-950 dark:text-slate-50">Histórico de Execuções</h2>
        <Clock3 class="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </div>
    </template>

    <div v-if="!props.runs.length" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      Nenhuma execução registrada no sistema.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
        <thead class="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900/60 dark:text-slate-500">
          <tr>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Tarefa / Erro</th>
            <th class="px-4 py-3 text-right">Fontes</th>
            <th class="px-4 py-3 text-right">Oportunidades</th>
            <th class="px-4 py-3">Início</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-for="run in props.runs" :key="run.id" class="align-top hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors">
            <!-- Status Badge -->
            <td class="px-4 py-3.5 whitespace-nowrap">
              <span class="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" :class="statusClass(run.status)">
                {{ statusLabel(run.status) }}
              </span>
            </td>

            <!-- Task Name & Error Message -->
            <td class="px-4 py-3.5">
              <div class="max-w-[220px] font-semibold text-slate-850 dark:text-slate-200">
                {{ run.task_name || 'Tarefa deletada' }}
              </div>
              <div v-if="run.error_message" class="mt-1 max-w-[280px] rounded bg-rose-50/50 p-1.5 text-xs text-rose-650 dark:bg-rose-950/20 dark:text-rose-300 border border-rose-100/50 dark:border-rose-900/20">
                {{ run.error_message }}
              </div>
            </td>

            <!-- Sources Count -->
            <td class="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
              {{ run.sources_count }}
            </td>

            <!-- Opportunities Count -->
            <td class="px-4 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
              {{ run.opportunities_count }}
            </td>

            <!-- Started At Date -->
            <td class="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {{ formatStockIntegrinDate(run.started_at) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
