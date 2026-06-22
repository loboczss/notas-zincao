<script setup lang="ts">
import {
  Bot,
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-vue-next'
import type {
  IntegrimCompraAiTask,
  IntegrimCompraProdutoSelectionMode,
} from '../../../shared/types/IntegrimNotas'
import Botao from '../Botao.vue'

const props = withDefaults(defineProps<{
  tasks: IntegrimCompraAiTask[]
  loading?: boolean
  actionLoading?: boolean
  isAdmin?: boolean
}>(), {
  loading: false,
  actionLoading: false,
  isAdmin: false,
})

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'create'): void
  (e: 'edit', task: IntegrimCompraAiTask): void
  (e: 'toggleTask', task: IntegrimCompraAiTask, enabled: boolean): void
  (e: 'runTask', taskId: string | null): void
}>()

const productSelectionLabels: Record<IntegrimCompraProdutoSelectionMode, string> = {
  top_score: 'Maior score',
  top_revenue: 'Maior faturamento',
  top_margin: 'Maior margem',
  top_quantity: 'Maior quantidade',
  random: 'Aleatorios',
  specific: 'Especificos',
}

const modelLabels: Record<string, string> = {
  'gpt-5.5': 'GPT-5.5',
  'gpt-5.4': 'GPT-5.4',
  'gpt-5.4-mini': 'GPT-5.4 Mini',
  'gpt-5.4-nano': 'GPT-5.4 Nano',
}

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sem proxima data'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sem proxima data'
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const scheduleSummary = (task: IntegrimCompraAiTask) => {
  const schedule = task.params.schedule
  const times = Array.isArray(schedule?.times) && schedule.times.length
    ? schedule.times.join(', ')
    : '09:15'
  if (schedule?.mode === 'weekly') return `Semana as ${times}`
  if (schedule?.mode === 'monthly') return `Dia ${schedule.month_day || 1} as ${times}`
  if (schedule?.mode === 'yearly') return `${schedule.year_day || 1}/${schedule.year_month || 1} as ${times}`
  return `Todo dia as ${times}`
}

const locationSummary = (task: IntegrimCompraAiTask) => {
  const city = String(task.params.city || '').trim()
  const state = String(task.params.state || '').trim().toUpperCase()
  return [city, state].filter(Boolean).join(' - ') || String(task.params.region || 'Brasil')
}

const productSelectionSummary = (task: IntegrimCompraAiTask) => {
  const selection = task.params.product_selection
  const mode = String(selection?.mode || 'top_score') as IntegrimCompraProdutoSelectionMode
  const label = productSelectionLabels[mode] || productSelectionLabels.top_score
  const limit = Number(selection?.limit || 50)
  if (mode === 'specific') {
    const total = Array.isArray(selection?.specific_products) ? selection.specific_products.length : 0
    return `${label}: ${total || limit} produtos`
  }
  return `${label}: ${limit} produtos`
}

const modelSummary = (task: IntegrimCompraAiTask) => {
  const model = String(task.params.model || 'gpt-5.4-mini')
  return modelLabels[model] || model
}

const sourceSummary = (task: IntegrimCompraAiTask) => {
  const count = Array.isArray(task.params.sources) ? task.params.sources.length : 0
  return count ? `${count} fontes` : 'Todas as fontes'
}
</script>

<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-slate-950 dark:text-slate-50">Tasks de pesquisa IA</h2>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Selecione, ative ou edite uma task sem mexer no restante do painel.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Botao variant="secondary" size="sm" :disabled="props.loading" @click="emit('refresh')">
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': props.loading }" />
          Atualizar
        </Botao>
        <Botao variant="accent" size="sm" :disabled="props.actionLoading || !props.isAdmin" @click="emit('create')">
          <Plus class="h-3.5 w-3.5" />
          Nova task
        </Botao>
      </div>
    </div>

    <div v-if="props.loading && !props.tasks.length" class="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-6 text-sm font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <Loader2 class="h-4 w-4 animate-spin text-brand-500" />
      Carregando tasks...
    </div>

    <div
      v-else-if="!props.tasks.length"
      class="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900/30"
    >
      <Bot class="mx-auto h-6 w-6 text-slate-400" />
      <p class="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Nenhuma task criada</p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Crie a primeira pesquisa automatica para a IA.</p>
      <Botao class="mt-4" variant="accent" :disabled="!props.isAdmin" @click="emit('create')">
        <Plus class="h-4 w-4" />
        Nova task
      </Botao>
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="task in props.tasks"
        :key="task.id"
        role="button"
        tabindex="0"
        class="group cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-slate-950/60"
        :class="task.enabled
          ? 'border-slate-200 dark:border-slate-800'
          : 'border-slate-200 opacity-70 dark:border-slate-800'"
        @click="emit('edit', task)"
        @keydown.enter.prevent="emit('edit', task)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span
                class="h-2 w-2 rounded-full"
                :class="task.enabled ? 'bg-emerald-500' : 'bg-slate-400'"
              />
              <p class="truncate text-sm font-bold text-slate-950 dark:text-slate-50">{{ task.name }}</p>
            </div>
            <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ modelSummary(task) }} · {{ sourceSummary(task) }}</p>
          </div>

          <label
            class="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors"
            :class="task.enabled
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'"
            @click.stop
          >
            <input
              type="checkbox"
              class="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
              :checked="task.enabled"
              :disabled="!props.isAdmin || props.actionLoading"
              @change="emit('toggleTask', task, ($event.target as HTMLInputElement).checked)"
            >
            {{ task.enabled ? 'Ativa' : 'Pausada' }}
          </label>
        </div>

        <div class="mt-4 grid gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div class="flex items-center gap-2">
            <CalendarDays class="h-3.5 w-3.5 text-slate-400" />
            <span class="truncate">{{ scheduleSummary(task) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Clock3 class="h-3.5 w-3.5 text-slate-400" />
            <span class="truncate">Proxima: {{ formatDateTime(task.next_run_at) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <MapPin class="h-3.5 w-3.5 text-slate-400" />
            <span class="truncate">{{ locationSummary(task) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Search class="h-3.5 w-3.5 text-slate-400" />
            <span class="truncate">{{ productSelectionSummary(task) }}</span>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span class="text-[11px] font-medium text-slate-400">
            {{ task.last_success_at ? `Ultimo sucesso ${formatDateTime(task.last_success_at)}` : 'Ainda sem sucesso' }}
          </span>
          <Botao
            type="button"
            variant="secondary"
            size="sm"
            :disabled="!props.isAdmin || props.actionLoading || !task.enabled || Boolean(task.locked_at)"
            @click.stop="emit('runTask', task.id)"
          >
            <Play class="h-3.5 w-3.5" />
            Rodar
          </Botao>
        </div>
      </article>
    </div>
  </section>
</template>
