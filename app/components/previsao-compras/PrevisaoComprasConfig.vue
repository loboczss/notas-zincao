<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  Activity,
  CalendarClock,
  CalendarRange,
  Clock3,
  RefreshCw,
  Save,
  Truck,
} from 'lucide-vue-next'
import type {
  IntegrimCompraParametros,
  IntegrimSyncHealth,
  IntegrimSyncSchedule,
} from '../../../shared/types/IntegrimNotas'
import { formatStockIntegrinNumber } from '../../utils/stock-integrin-format'
import Botao from '../Botao.vue'
import Input from '../Input.vue'
import SelectInput from '../SelectInput.vue'

const props = withDefaults(defineProps<{
  schedule: IntegrimSyncSchedule | null
  health: IntegrimSyncHealth | null
  parametros: IntegrimCompraParametros | null
  isAdmin?: boolean
  saving?: boolean
  syncing?: boolean
}>(), {
  isAdmin: false,
  saving: false,
  syncing: false,
})

const emit = defineEmits<{
  (e: 'saveSchedule', payload: { enabled: boolean, times: string[], window_months: number, timezone: string, deactivate_stale: boolean }): void
  (e: 'saveParametros', payload: { lead_time_dias: number, coverage_days: number }): void
  (e: 'syncPeriodo', payload: { date_start: string, date_end: string }): void
  (e: 'refresh'): void
}>()

const timezones = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Cuiaba',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
]

const form = reactive({
  enabled: true,
  times: ['03:00'],
  windowMonths: '24',
  timezone: 'America/Sao_Paulo',
  deactivateStale: true,
})

const paramsForm = reactive({
  leadTime: '7',
  coverage: '45',
})

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

// Periodo manual: por padrao [hoje - 12 meses, hoje]. O usuario ajusta livremente.
const buildDefaultPeriod = () => {
  const end = new Date()
  const start = new Date(end)
  start.setMonth(start.getMonth() - 12)
  return { start: toIsoDate(start), end: toIsoDate(end) }
}

const periodForm = reactive(buildDefaultPeriod())

const hojeIso = toIsoDate(new Date())

const periodoValido = computed(() => {
  const { start, end } = periodForm
  const iso = /^\d{4}-\d{2}-\d{2}$/
  return iso.test(start) && iso.test(end) && start <= end
})

const sincronizarPeriodo = () => {
  if (!periodoValido.value || !props.isAdmin || props.syncing) return
  emit('syncPeriodo', { date_start: periodForm.start, date_end: periodForm.end })
}

watch(() => props.schedule, (schedule) => {
  if (!schedule) return
  form.enabled = schedule.enabled
  form.times = schedule.times.length ? [...schedule.times] : ['03:00']
  form.windowMonths = String(schedule.window_months)
  form.timezone = schedule.timezone
  form.deactivateStale = schedule.deactivate_stale
}, { immediate: true })

watch(() => props.parametros, (parametros) => {
  if (!parametros) return
  paramsForm.leadTime = String(parametros.lead_time_dias)
  paramsForm.coverage = String(parametros.coverage_days)
}, { immediate: true })

const cleanTimes = computed(() => {
  const times = form.times
    .map(time => String(time || '').trim())
    .filter(time => /^\d{2}:\d{2}$/.test(time))
  const unique = [...new Set(times)].sort()
  return unique.length ? unique : ['03:00']
})

const addTime = () => {
  if (form.times.length >= 6) return
  form.times = [...form.times, '03:00']
}
const removeTime = (index: number) => {
  if (form.times.length <= 1) return
  form.times = form.times.filter((_, i) => i !== index)
}
const updateTime = (index: number, value: string) => {
  form.times = form.times.map((time, i) => (i === index ? value : time))
}

const saveSchedule = () => {
  emit('saveSchedule', {
    enabled: form.enabled,
    times: cleanTimes.value,
    window_months: Math.min(120, Math.max(1, Number(form.windowMonths || 24))),
    timezone: form.timezone,
    deactivate_stale: form.deactivateStale,
  })
}

const saveParametros = () => {
  emit('saveParametros', {
    lead_time_dias: Math.min(365, Math.max(0, Number(paramsForm.leadTime || 7))),
    coverage_days: Math.min(365, Math.max(1, Number(paramsForm.coverage || 45))),
  })
}

const formatDateTime = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const statusLabel = computed(() => {
  const status = props.health?.last_status
  if (props.health?.running) return 'Sincronizando agora'
  if (status === 'success') return 'Último sync: sucesso'
  if (status === 'failed') return 'Último sync: falhou'
  if (status === 'cancelled') return 'Último sync: cancelado'
  return 'Sem histórico de sync'
})

const statusTone = computed(() => {
  if (props.health?.running) return 'sky'
  if (props.health?.last_status === 'success') return 'emerald'
  if (props.health?.last_status === 'failed') return 'rose'
  return 'slate'
})

const toneClasses: Record<string, string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
  sky: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
}

const semDadosDiarios = computed(() => (props.health?.daily_rows ?? 0) === 0)
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
    <!-- Coluna esquerda: Agendamento + Parametros -->
    <div class="space-y-5">
      <!-- Agendamento -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div class="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <span class="inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <CalendarClock class="h-4 w-4 text-brand-500" />
            Agendamento da sincronização
          </span>
          <label
            class="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-bold"
            :class="form.enabled
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'"
          >
            <input
              type="checkbox"
              class="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 dark:border-slate-700"
              :checked="form.enabled"
              :disabled="!props.isAdmin"
              @change="form.enabled = ($event.target as HTMLInputElement).checked"
            >
            {{ form.enabled ? 'Ativo' : 'Pausado' }}
          </label>
        </div>

        <div class="space-y-4">
          <!-- Horarios -->
          <div class="space-y-2">
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <Clock3 class="h-3.5 w-3.5" />
              Horários de sincronização (máx. 6)
            </span>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(time, index) in form.times"
                :key="`${index}-${time}`"
                class="flex h-9 items-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                <input
                  type="time"
                  class="h-full w-[100px] bg-transparent px-3 text-sm font-semibold text-slate-900 outline-none dark:text-slate-100"
                  :value="time"
                  :disabled="!props.isAdmin"
                  @input="updateTime(index, ($event.target as HTMLInputElement).value)"
                >
                <button
                  type="button"
                  class="h-full border-l border-slate-200 px-2.5 text-xs font-bold text-slate-400 hover:text-rose-500 disabled:opacity-40 dark:border-slate-800"
                  :disabled="!props.isAdmin || form.times.length <= 1"
                  @click="removeTime(index)"
                >
                  ×
                </button>
              </div>
              <button
                type="button"
                class="h-9 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
                :disabled="!props.isAdmin || form.times.length >= 6"
                @click="addTime"
              >
                + Horário
              </button>
            </div>
          </div>

          <!-- Janela + Timezone -->
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1.5 block">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Janela de histórico (meses)</span>
              <Input v-model="form.windowMonths" type="number" min="1" max="120" step="1" class="h-10" :disabled="!props.isAdmin" />
              <span class="block text-[11px] text-slate-400">Quanto tempo para trás baixar a cada sincronização (padrão 24).</span>
            </label>
            <label class="space-y-1.5 block">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fuso horário</span>
              <SelectInput v-model="form.timezone" class="h-10" :disabled="!props.isAdmin">
                <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
              </SelectInput>
            </label>
          </div>

          <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              class="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 dark:border-slate-700"
              :checked="form.deactivateStale"
              :disabled="!props.isAdmin"
              @change="form.deactivateStale = ($event.target as HTMLInputElement).checked"
            >
            Desativar notas que sumiram da janela (recomendado)
          </label>

          <div class="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span class="text-xs text-slate-500 dark:text-slate-400">
              Próxima execução:
              <strong class="text-slate-700 dark:text-slate-200">{{ formatDateTime(props.schedule?.next_run_at || null) }}</strong>
            </span>
            <Botao type="button" variant="secondary" :disabled="props.saving || !props.isAdmin" @click="saveSchedule">
              <Save class="h-4 w-4" />
              Salvar agenda
            </Botao>
          </div>
        </div>
      </div>

      <!-- Sincronizacao manual por periodo -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div class="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-800 dark:border-slate-800 dark:text-slate-100">
          <CalendarRange class="h-4 w-4 text-brand-500" />
          Sincronizar um período específico
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="space-y-1.5 block">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Data inicial</span>
            <Input v-model="periodForm.start" type="date" :max="periodForm.end || hojeIso" class="h-10" :disabled="!props.isAdmin || props.syncing" />
          </label>
          <label class="space-y-1.5 block">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Data final</span>
            <Input v-model="periodForm.end" type="date" :min="periodForm.start" :max="hojeIso" class="h-10" :disabled="!props.isAdmin || props.syncing" />
          </label>
        </div>
        <p class="mt-2 text-[11px] text-slate-400">
          Baixa as vendas das 6 empresas só nesse intervalo e recalcula a análise. Datas no futuro são ajustadas para hoje.
        </p>
        <div class="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span v-if="!periodoValido" class="text-[11px] font-semibold text-rose-500">
            A data inicial deve ser menor ou igual à final.
          </span>
          <span v-else />
          <Botao type="button" :disabled="!periodoValido || props.syncing || !props.isAdmin" @click="sincronizarPeriodo">
            <RefreshCw class="h-4 w-4" :class="props.syncing ? 'animate-spin' : ''" />
            {{ props.syncing ? 'Sincronizando…' : 'Sincronizar período' }}
          </Botao>
        </div>
      </div>

      <!-- Parametros de compra -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div class="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-800 dark:border-slate-800 dark:text-slate-100">
          <Truck class="h-4 w-4 text-brand-500" />
          Parâmetros de compra
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="space-y-1.5 block">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Lead time (dias até a reposição)</span>
            <Input v-model="paramsForm.leadTime" type="number" min="0" max="365" step="1" class="h-10" :disabled="!props.isAdmin" />
          </label>
          <label class="space-y-1.5 block">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cobertura padrão (dias)</span>
            <Input v-model="paramsForm.coverage" type="number" min="1" max="365" step="1" class="h-10" :disabled="!props.isAdmin" />
          </label>
        </div>
        <p class="mt-2 text-[11px] text-slate-400">
          Usados no alerta de ruptura e na sugestão de compra. O lead time pode ser derivado automaticamente quando a
          sincronização de notas de entrada for adicionada.
        </p>
        <div class="mt-3 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
          <Botao type="button" variant="secondary" :disabled="props.saving || !props.isAdmin" @click="saveParametros">
            <Save class="h-4 w-4" />
            Salvar parâmetros
          </Botao>
        </div>
      </div>
    </div>

    <!-- Coluna direita: Saude do sync -->
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div class="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <span class="inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <Activity class="h-4 w-4 text-brand-500" />
          Saúde do sincronismo
        </span>
        <button type="button" class="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400" @click="emit('refresh')">
          Atualizar
        </button>
      </div>

      <div class="space-y-3">
        <div class="rounded-xl border px-3 py-2.5 text-sm font-bold" :class="toneClasses[statusTone]">
          {{ statusLabel }}
        </div>

        <div
          v-if="semDadosDiarios"
          class="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          Tabela de vendas por dia vazia: períodos personalizados ficam zerados até a próxima sincronização bem-sucedida.
        </div>

        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-slate-500 dark:text-slate-400">Último sucesso</dt>
            <dd class="font-semibold text-slate-800 dark:text-slate-200">{{ formatDateTime(props.health?.last_success_at || null) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-slate-500 dark:text-slate-400">Vendas/dia armazenadas</dt>
            <dd class="font-semibold text-slate-800 dark:text-slate-200">{{ formatStockIntegrinNumber(props.health?.daily_rows || 0, 0) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-slate-500 dark:text-slate-400">Dados diários até</dt>
            <dd class="font-semibold text-slate-800 dark:text-slate-200">
              {{ props.health?.daily_max_date || '—' }}
              <span v-if="props.health?.daily_stale_days != null" class="text-xs text-slate-400">({{ props.health?.daily_stale_days }}d atrás)</span>
            </dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-slate-500 dark:text-slate-400">Produtos analisados</dt>
            <dd class="font-semibold text-slate-800 dark:text-slate-200">{{ formatStockIntegrinNumber(props.health?.produtos || 0, 0) }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3">
            <dt class="text-slate-500 dark:text-slate-400">Análise recalculada em</dt>
            <dd class="font-semibold text-slate-800 dark:text-slate-200">{{ formatDateTime(props.health?.base_updated_at || null) }}</dd>
          </div>
        </dl>

        <div
          v-if="props.health?.last_status === 'failed' && props.health?.last_error"
          class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          <p class="mb-1 font-bold">Erro do último sync</p>
          <p class="line-clamp-3 break-words font-mono">{{ props.health?.last_error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
