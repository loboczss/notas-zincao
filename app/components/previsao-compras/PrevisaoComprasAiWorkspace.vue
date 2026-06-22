<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bot, CalendarClock, Sparkles } from 'lucide-vue-next'
import type {
  IntegrimCompraAiDashboardResponse,
  IntegrimCompraAiTask,
  IntegrimCompraAiTaskUpsertRequest,
  IntegrimCompraOportunidadeStatus,
} from '../../../shared/types/IntegrimNotas'
import PrevisaoComprasAiStatsGrid from './PrevisaoComprasAiStatsGrid.vue'
import PrevisaoComprasAiTaskConfig from './PrevisaoComprasAiTaskConfig.vue'
import PrevisaoComprasAiTaskCards from './PrevisaoComprasAiTaskCards.vue'
import PrevisaoComprasAiRunsList from './PrevisaoComprasAiRunsList.vue'
import PrevisaoComprasAiOportunidades from './PrevisaoComprasAiOportunidades.vue'
import PrevisaoComprasAiEventos from './PrevisaoComprasAiEventos.vue'

const props = withDefaults(defineProps<{
  dashboard: IntegrimCompraAiDashboardResponse | null
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
  (e: 'createTask', payload: IntegrimCompraAiTaskUpsertRequest): void
  (e: 'updateTask', id: string, payload: IntegrimCompraAiTaskUpsertRequest): void
  (e: 'runTask', taskId: string | null): void
  (e: 'opportunityAction', input: {
    id: string
    status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>
  }): void
}>()

const tasks = computed(() => props.dashboard?.tasks || [])
const runs = computed(() => props.dashboard?.runs || [])
const eventos = computed(() => props.dashboard?.eventos || [])
const oportunidades = computed(() => props.dashboard?.oportunidades || [])
const stats = computed(() => props.dashboard?.stats || {
  tasks_total: 0,
  tasks_enabled: 0,
  runs_24h: 0,
  last_run_status: null,
  oportunidades_novas: 0,
  oportunidades_aceitas: 0,
  oportunidades_compradas: 0,
  eventos_30d: 0,
})

const activeSubTab = ref<'oportunidades' | 'eventos' | 'tasks'>('oportunidades')

const subTabs = computed(() => [
  { id: 'oportunidades' as const, label: 'Oportunidades', icon: Sparkles, count: oportunidades.value.length },
  { id: 'eventos' as const, label: 'Eventos de Mercado', icon: CalendarClock, count: eventos.value.length },
  { id: 'tasks' as const, label: 'Automação & Logs', icon: Bot, count: tasks.value.length },
])

const taskEditorOpen = ref(false)
const editingTask = ref<IntegrimCompraAiTask | null>(null)

const openCreateTask = () => {
  editingTask.value = null
  taskEditorOpen.value = true
}

const openEditTask = (task: IntegrimCompraAiTask) => {
  editingTask.value = task
  taskEditorOpen.value = true
}

const toggleTask = (task: IntegrimCompraAiTask, enabled: boolean) => {
  emit('updateTask', task.id, {
    name: task.name,
    enabled,
    schedule_cron: task.schedule_cron,
    timezone: task.timezone,
    params: task.params,
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Grid de KPIs da IA (Clicar em um KPI altera a sub-aba correspondente) -->
    <PrevisaoComprasAiStatsGrid :stats="stats" @click-card="subTab => activeSubTab = subTab" />

    <!-- Alerta sobre privilégios de Administrador -->
    <div
      v-if="!props.isAdmin"
      class="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/5 dark:text-amber-300 animate-fade-in"
    >
      A edição e execução das tasks ficam liberadas apenas para administradores.
    </div>

    <!-- Navegação de Sub-Abas -->
    <div class="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto pb-px">
      <button
        v-for="subTab in subTabs"
        :key="subTab.id"
        type="button"
        class="pb-3 text-sm font-bold transition-all relative flex items-center gap-2 shrink-0 outline-none focus:text-slate-800 dark:focus:text-slate-100"
        :class="activeSubTab === subTab.id ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
        @click="activeSubTab = subTab.id"
      >
        <component :is="subTab.icon" class="h-4 w-4" />
        {{ subTab.label }}
        <span
          v-if="subTab.count !== undefined"
          class="rounded-full px-1.5 py-0.5 text-[10px] font-extrabold"
          :class="activeSubTab === subTab.id
            ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'"
        >
          {{ subTab.count }}
        </span>
        <span v-if="activeSubTab === subTab.id" class="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 dark:bg-brand-400 rounded-full" />
      </button>
    </div>

    <!-- Telas das Sub-Abas -->
    <div class="space-y-6">
      <!-- Oportunidades -->
      <div v-if="activeSubTab === 'oportunidades'" class="space-y-6">
        <PrevisaoComprasAiOportunidades
          :oportunidades="oportunidades"
          :is-admin="props.isAdmin"
          :action-loading="props.actionLoading"
          @opportunity-action="input => emit('opportunityAction', input)"
        />
      </div>

      <!-- Eventos de Mercado -->
      <div v-else-if="activeSubTab === 'eventos'" class="space-y-6">
        <PrevisaoComprasAiEventos :eventos="eventos" />
      </div>

      <!-- Automação & Logs -->
      <div v-else-if="activeSubTab === 'tasks'" class="space-y-6">
        <PrevisaoComprasAiTaskCards
          :tasks="tasks"
          :is-admin="props.isAdmin"
          :loading="props.loading"
          :action-loading="props.actionLoading"
          @refresh="emit('refresh')"
          @create="openCreateTask"
          @edit="openEditTask"
          @toggle-task="toggleTask"
          @run-task="taskId => emit('runTask', taskId)"
        />

        <PrevisaoComprasAiRunsList :runs="runs" />
      </div>
    </div>

    <!-- Modal de Configuração / Edição de Task -->
    <PrevisaoComprasAiTaskConfig
      v-model="taskEditorOpen"
      :task="editingTask"
      :is-admin="props.isAdmin"
      :action-loading="props.actionLoading"
      @create-task="payload => emit('createTask', payload)"
      @update-task="(id, payload) => emit('updateTask', id, payload)"
      @run-task="taskId => emit('runTask', taskId)"
    />
  </div>
</template>
