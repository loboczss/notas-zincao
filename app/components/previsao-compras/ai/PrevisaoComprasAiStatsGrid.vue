<script setup lang="ts">
import { computed } from 'vue'
import {
  Activity,
  Bot,
  FileSearch,
  Sparkles,
} from 'lucide-vue-next'
import type { IntegrimCompraAiDashboardStats } from '../../../../shared/types/IntegrimNotas'
import Card from '../../Card.vue'

const props = defineProps<{
  stats: IntegrimCompraAiDashboardStats
}>()

const emit = defineEmits<{
  (e: 'clickCard', subTab: 'oportunidades' | 'eventos' | 'tasks'): void
}>()

const lastRunStatusLabel = computed(() => {
  const status = props.stats.last_run_status
  if (status === 'running') return 'Rodando'
  if (status === 'success') return 'Sucesso'
  if (status === 'failed') return 'Falha'
  return 'Inativa'
})

const lastRunStatusClass = computed(() => {
  const status = props.stats.last_run_status
  if (status === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
  }
  if (status === 'running') {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300'
  }
  if (status === 'failed') {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
  }
  return 'border-slate-100 bg-slate-50 text-slate-600 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-400'
})
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <!-- Tasks Ativas -->
    <Card
      padding-class="p-5"
      class="cursor-pointer transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 active:scale-[0.98]"
      @click="emit('clickCard', 'tasks')"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tasks Ativas</span>
        <div class="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <Bot class="h-5 w-5" />
        </div>
      </div>
      <div class="mt-4">
        <h3 class="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
          {{ props.stats.tasks_enabled }}/{{ props.stats.tasks_total }}
        </h3>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Agendadas e ativas no sistema
        </p>
      </div>
    </Card>

    <!-- Runs 24h -->
    <Card
      padding-class="p-5"
      class="cursor-pointer transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 active:scale-[0.98]"
      @click="emit('clickCard', 'tasks')"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Execuções (24h)</span>
        <div class="rounded-lg bg-sky-50 p-2 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
          <Activity class="h-5 w-5" />
        </div>
      </div>
      <div class="mt-4 flex items-end justify-between gap-3">
        <div>
          <h3 class="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
            {{ props.stats.runs_24h }}
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Últimas 24 horas
          </p>
        </div>
        <span class="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" :class="lastRunStatusClass">
          {{ lastRunStatusLabel }}
        </span>
      </div>
    </Card>

    <!-- Oportunidades -->
    <Card
      padding-class="p-5"
      class="cursor-pointer transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 active:scale-[0.98]"
      @click="emit('clickCard', 'oportunidades')"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Oportunidades</span>
        <div class="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
          <Sparkles class="h-5 w-5" />
        </div>
      </div>
      <div class="mt-4">
        <h3 class="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
          {{ props.stats.oportunidades_novas }}
        </h3>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Sugestões novas pendentes
        </p>
      </div>
    </Card>

    <!-- Eventos 30d -->
    <Card
      padding-class="p-5"
      class="cursor-pointer transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 active:scale-[0.98]"
      @click="emit('clickCard', 'eventos')"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Eventos (30d)</span>
        <div class="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
          <FileSearch class="h-5 w-5" />
        </div>
      </div>
      <div class="mt-4">
        <h3 class="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
          {{ props.stats.eventos_30d }}
        </h3>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Identificados externamente
        </p>
      </div>
    </Card>
  </div>
</template>
