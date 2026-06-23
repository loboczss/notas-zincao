<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, onMounted, onUnmounted } from 'vue'
import {
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Play,
  Save,
  Search,
  SlidersHorizontal,
} from 'lucide-vue-next'
import type {
  IntegrimCompraAiTask,
  IntegrimCompraAiTaskUpsertRequest,
  IntegrimCompraEventoTipo,
  IntegrimCompraProdutoSelectionMode,
} from '../../../../shared/types/IntegrimNotas'
import { getApiFetch } from '../../../utils/api-fetch'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../../utils/stock-integrin-format'
import Botao from '../../Botao.vue'
import Input from '../../Input.vue'
import ModalGlobal from '../../ModalGlobal.vue'
import SelectInput from '../../SelectInput.vue'

type ScheduleMode = 'daily' | 'weekly' | 'monthly' | 'yearly'
type RigorMode = 'safe' | 'balanced' | 'wide'
type ScheduleConfig = {
  mode?: ScheduleMode
  times?: string[]
  weekdays?: number[]
  month_day?: number | string
  year_month?: number | string
  year_day?: number | string
}

type ProductSelectionConfig = {
  mode?: IntegrimCompraProdutoSelectionMode
  limit?: number | string
  specific_products?: string[]
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  task: IntegrimCompraAiTask | null
  isAdmin?: boolean
  actionLoading?: boolean
}>(), {
  isAdmin: false,
  actionLoading: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'createTask', payload: IntegrimCompraAiTaskUpsertRequest): void
  (e: 'updateTask', id: string, payload: IntegrimCompraAiTaskUpsertRequest): void
  (e: 'runTask', taskId: string | null): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const eventTypes: IntegrimCompraEventoTipo[] = [
  'clima',
  'cidade',
  'esporte',
  'feriado',
  'obra',
  'tendencia',
  'fornecedor',
]

const eventTypeLabels: Record<IntegrimCompraEventoTipo, string> = {
  clima: 'Clima',
  cidade: 'Cidade',
  esporte: 'Esporte',
  feriado: 'Feriado',
  obra: 'Obra',
  tendencia: 'Tendência',
  fornecedor: 'Fornecedor',
}

const weekDays = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const scheduleModes: Array<{ value: ScheduleMode, label: string }> = [
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekly', label: 'Semana' },
  { value: 'monthly', label: 'Mês' },
  { value: 'yearly', label: 'Ano' },
]

const rigorOptions: Array<{ value: RigorMode, label: string, confidence: number }> = [
  { value: 'safe', label: 'Mais seguro (Confiança 75%)', confidence: 0.75 },
  { value: 'balanced', label: 'Equilibrado (Confiança 62%)', confidence: 0.62 },
  { value: 'wide', label: 'Mais oportunidades (Confiança 50%)', confidence: 0.5 },
]

const maxOpportunityOptions = [
  { value: '5', label: 'Até 5 sugestões' },
  { value: '10', label: 'Até 10 sugestões' },
  { value: '20', label: 'Até 20 sugestões' },
  { value: '30', label: 'Até 30 sugestões' },
]

const productSelectionModes: Array<{ value: IntegrimCompraProdutoSelectionMode, label: string, helper: string }> = [
  { value: 'top_score', label: 'Maior score', helper: 'Prioriza produtos mais fortes no cálculo.' },
  { value: 'top_revenue', label: 'Maior faturamento', helper: 'Prioriza produtos que mais vendem em valor.' },
  { value: 'top_margin', label: 'Maior margem', helper: 'Prioriza produtos que deixam mais margem.' },
  { value: 'top_quantity', label: 'Maior quantidade', helper: 'Prioriza produtos com maior giro em unidades.' },
  { value: 'random', label: 'Aleatórios', helper: 'Faz uma amostra para encontrar oportunidades fora do óbvio.' },
  { value: 'specific', label: 'Específicos', helper: 'Usa somente os produtos informados abaixo.' },
]

const productLimitOptions = ['20', '50', '100', '200', '500', '1000']

const stateOptions = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const monthOptions = [
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Fev' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Abr' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Ago' },
  { value: '9', label: 'Set' },
  { value: '10', label: 'Out' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dez' },
]

const aiModelOptions = [
  { id: 'gpt-5.5', label: 'GPT-5.5', description: 'Mais completo para análises com maior precisão.' },
  { id: 'gpt-5.4', label: 'GPT-5.4', description: 'Forte para cruzar notícias, produtos e contexto.' },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini', description: 'Equilibrado para rodar todo dia com bom custo.' },
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano', description: 'Mais econômico para alto volume.' },
] as const

type AiModelId = (typeof aiModelOptions)[number]['id']

const defaultAiModel: AiModelId = 'gpt-5.4-mini'

const isAiModelSupported = (value: string): value is AiModelId => {
  return aiModelOptions.some(model => model.id === value)
}

const isProductSelectionMode = (value: string): value is IntegrimCompraProdutoSelectionMode => {
  return productSelectionModes.some(mode => mode.value === value)
}

const form = reactive({
  id: '',
  name: '',
  enabled: true,
  scheduleMode: 'daily' as ScheduleMode,
  times: ['09:15', '19:15'],
  weekdays: [1, 2, 3, 4, 5],
  monthDay: '1',
  yearMonth: '1',
  yearDay: '1',
  timezone: 'America/Sao_Paulo',
  city: '',
  state: '',
  rigor: 'balanced' as RigorMode,
  max_opportunities: '20',
  model: defaultAiModel as AiModelId,
  productSelectionMode: 'top_score' as IntegrimCompraProdutoSelectionMode,
  productLimit: '50',
  idempresa: '',
  specificProductsText: '',
  sources: [...eventTypes] as IntegrimCompraEventoTipo[],
  historyDateStart: '',
  historyDateEnd: '',
  coverageDays: '45',
  productsPerAiCall: '',
  customPromptEnabled: false,
  customPromptText: '',
})

const locationAutofillKey = ref(0)
const activeModalTab = ref<'geral' | 'produtos' | 'ia'>('geral')

const modalTabs = [
  { id: 'geral' as const, label: 'Geral & Agenda' },
  { id: 'produtos' as const, label: 'Filtro de Produtos' },
  { id: 'ia' as const, label: 'Parâmetros IA' },
]

const isEditing = computed(() => Boolean(form.id))
const taskIsLocked = computed(() => Boolean(props.task?.locked_at))
const canRunSelectedTask = computed(() => props.isAdmin && Boolean(form.id) && form.enabled && !props.actionLoading && !taskIsLocked.value)

const selectedModelDescription = computed(() => {
  return aiModelOptions.find(model => model.id === form.model)?.description || ''
})

const productSelectionDescription = computed(() => {
  return productSelectionModes.find(mode => mode.value === form.productSelectionMode)?.helper || ''
})

const cleanTimes = computed(() => {
  const times = form.times
    .map(time => String(time || '').trim())
    .filter(time => /^\d{2}:\d{2}$/.test(time))
  return [...new Set(times)].length ? [...new Set(times)] : ['09:15']
})

const cleanSpecificProducts = computed(() => {
  return form.specificProductsText
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 1000)
})

const confidenceValue = computed(() => {
  return rigorOptions.find(option => option.value === form.rigor)?.confidence || 0.62
})

const apiFetch = getApiFetch()

// Autocomplete search refs
const specificSearchQuery = ref('')
const searchResults = ref<any[]>([])
const loadingSearch = ref(false)
const selectedProductsMap = ref<Record<string, string>>({})
const isDropdownOpen = ref(false)
const searchContainerRef = ref<HTMLElement | null>(null)

// Handle click outside to close search dropdown
const handleClickOutside = (event: MouseEvent) => {
  if (searchContainerRef.value && !searchContainerRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Preview list refs
const previewList = ref<any[]>([])
const loadingPreview = ref(false)

// Watch search query
let searchTimeout: NodeJS.Timeout | null = null
watch(specificSearchQuery, (query) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!query.trim()) {
    searchResults.value = []
    return
  }
  isDropdownOpen.value = true
  searchTimeout = setTimeout(async () => {
    loadingSearch.value = true
    try {
      const data = await apiFetch<any>('/api/stock-integrin/list', {
        query: {
          search: query,
          page_size: 10,
          idempresa: form.idempresa ? Number(form.idempresa) : undefined
        }
      })
      searchResults.value = data.produtos || []
    } catch (e) {
      console.error(e)
    } finally {
      loadingSearch.value = false
    }
  }, 300)
})

// Add specific product from search dropdown
const addSpecificProduct = (prod: any) => {
  const code = `${prod.idproduto}/${prod.idsubproduto}`
  selectedProductsMap.value[code] = prod.descrcomproduto || prod.descricao || `Produto ${code}`
  
  const currentList = cleanSpecificProducts.value
  if (!currentList.includes(code)) {
    form.specificProductsText = form.specificProductsText
      ? `${form.specificProductsText.trim()}\n${code}`
      : code
  }
  specificSearchQuery.value = ''
  searchResults.value = []
  isDropdownOpen.value = false
}

// Remove specific product from selected tags list
const removeSpecificProduct = (code: string) => {
  const nextList = cleanSpecificProducts.value.filter(item => item !== code)
  form.specificProductsText = nextList.join('\n')
}

// Fetch preview list
const fetchPreview = async () => {
  loadingPreview.value = true
  try {
    const mode = form.productSelectionMode
    const limit = Number(form.productLimit || 50)
    
    if (mode === 'specific') {
      const terms = cleanSpecificProducts.value
      if (!terms.length) {
        previewList.value = []
        return
      }
      
      const products: any[] = []
      for (const term of terms) {
        if (products.length >= limit) break
        const data = await apiFetch<any>('/api/integrim-notas/catalog/produtos', {
          query: {
            sort: 'score_valor',
            page: 1,
            page_size: Math.min(20, limit - products.length),
            search: term,
            idempresa: form.idempresa ? Number(form.idempresa) : undefined,
            date_start: form.historyDateStart || undefined,
            date_end: form.historyDateEnd || undefined,
            coverage_days: form.coverageDays ? Number(form.coverageDays) : undefined
          }
        })
        if (data.produtos?.length) {
          const pairMatch = term.match(/^([0-9]+)\/([0-9]+)$/)
          if (pairMatch) {
            const idproduto = Number(pairMatch[1])
            const idsubproduto = Number(pairMatch[2])
            const exactMatches = data.produtos.filter((p: any) => Number(p.idproduto) === idproduto && Number(p.idsubproduto) === idsubproduto)
            products.push(...exactMatches)
          } else {
            products.push(...data.produtos)
          }
        }
      }
      
      const deduped: any[] = []
      const seen = new Set()
      for (const p of products) {
        const key = `${p.idproduto}/${p.idsubproduto}`
        if (!seen.has(key)) {
          seen.add(key)
          deduped.push(p)
        }
      }
      previewList.value = deduped.slice(0, limit)
    } else {
      const sortMap: Record<string, string> = {
        top_score: 'score_valor',
        top_revenue: 'faturamento_periodo',
        top_margin: 'margem_periodo',
        top_quantity: 'qtd_periodo',
        random: 'score_valor'
      }
      const sort = sortMap[mode] || 'score_valor'
      const data = await apiFetch<any>('/api/integrim-notas/catalog/produtos', {
        query: {
          sort,
          page: 1,
          page_size: limit,
          idempresa: form.idempresa ? Number(form.idempresa) : undefined,
          date_start: form.historyDateStart || undefined,
          date_end: form.historyDateEnd || undefined,
          coverage_days: form.coverageDays ? Number(form.coverageDays) : undefined
        }
      })
      previewList.value = data.produtos || []
    }
  } catch (e) {
    console.error(e)
  } finally {
    loadingPreview.value = false
  }
}

// Populate descriptions from previewList fetch results
watch(previewList, (list) => {
  list.forEach(p => {
    const code = `${p.idproduto}/${p.idsubproduto}`
    selectedProductsMap.value[code] = p.descricao || `Produto ${code}`
  })
})

// Trigger preview fetch when inputs change
watch([
  () => form.productSelectionMode,
  () => form.productLimit,
  () => form.specificProductsText,
  () => form.idempresa,
  () => form.historyDateStart,
  () => form.historyDateEnd,
  () => form.coverageDays,
  () => props.modelValue
], ([mode, limit, specText, idempresa, dStart, dEnd, covDays, opened]) => {
  if (!opened) return
  fetchPreview()
}, { immediate: true })

const getMetricLabel = (prod: any) => {
  const mode = form.productSelectionMode
  if (mode === 'top_revenue') {
    return formatStockIntegrinCurrency(prod.faturamento_periodo)
  }
  if (mode === 'top_margin') {
    return formatStockIntegrinCurrency(prod.margem_periodo)
  }
  if (mode === 'top_quantity') {
    return `${formatStockIntegrinNumber(prod.qtd_periodo, 0)} un`
  }
  return `Score: ${formatStockIntegrinNumber(prod.score_valor, 1)}`
}

const locationLabel = computed(() => {
  const city = form.city.trim()
  const state = form.state.trim()
  return [city, state].filter(Boolean).join(' - ') || 'Brasil'
})

const cronExpressions = computed(() => {
  return cleanTimes.value.map((time) => {
    const [hour = '9', minute = '15'] = time.split(':')
    const hourNumber = Number(hour)
    const minuteNumber = Number(minute)
    const monthDay = Math.min(31, Math.max(1, Number(form.monthDay || 1)))
    const yearMonth = Math.min(12, Math.max(1, Number(form.yearMonth || 1)))
    const yearDay = Math.min(31, Math.max(1, Number(form.yearDay || 1)))

    if (form.scheduleMode === 'weekly') return `${minuteNumber} ${hourNumber} * * ${form.weekdays.join(',') || '1'}`
    if (form.scheduleMode === 'monthly') return `${minuteNumber} ${hourNumber} ${monthDay} * *`
    if (form.scheduleMode === 'yearly') return `${minuteNumber} ${hourNumber} ${yearDay} ${yearMonth} *`
    return `${minuteNumber} ${hourNumber} * * *`
  })
})

const scheduleSummary = computed(() => {
  const times = cleanTimes.value.join(', ')
  if (form.scheduleMode === 'weekly') {
    const selected = weekDays
      .filter(day => form.weekdays.includes(day.value))
      .map(day => day.label)
      .join(', ')
    return `${selected || 'Seg'} às ${times}`
  }
  if (form.scheduleMode === 'monthly') return `Todo mês, dia ${form.monthDay || 1}, às ${times}`
  if (form.scheduleMode === 'yearly') return `Todo ano, ${form.yearDay || 1}/${form.yearMonth || 1}, às ${times}`
  return `Todo dia às ${times}`
})

const confidenceToRigor = (value: unknown): RigorMode => {
  const confidence = Number(value || 0.62)
  if (confidence >= 0.7) return 'safe'
  if (confidence <= 0.55) return 'wide'
  return 'balanced'
}

const parseCronToSchedule = (cron: string) => {
  const firstCron = String(cron || '').split(';')[0]?.trim() || '15 9,19 * * *'
  const [minute = '15', hour = '9', day = '*', month = '*', weekday = '*'] = firstCron.split(/\s+/)
  const minutes = minute.split(',').filter(Boolean)
  const hours = hour.split(',').filter(Boolean)
  const times = hours.flatMap(hourPart => minutes.map(minutePart => `${hourPart.padStart(2, '0')}:${minutePart.padStart(2, '0')}`))

  if (day !== '*' && month !== '*') return { mode: 'yearly' as ScheduleMode, times, year_month: month, year_day: day }
  if (day !== '*') return { mode: 'monthly' as ScheduleMode, times, month_day: day }
  if (weekday !== '*') {
    return {
      mode: 'weekly' as ScheduleMode,
      times,
      weekdays: weekday.split(',').map(value => Number(value)).filter(value => value >= 0 && value <= 6),
    }
  }
  return { mode: 'daily' as ScheduleMode, times }
}

const getTaskLocation = (task: IntegrimCompraAiTask | null) => {
  return {
    city: String(task?.params?.city || ''),
    state: String(task?.params?.state || ''),
  }
}

const guardLocationAutofill = (task: IntegrimCompraAiTask | null) => {
  if (typeof window === 'undefined') return

  const expected = getTaskLocation(task)
  const expectedTaskId = task?.id || ''
  const restoreExpectedLocation = () => {
    if (form.id !== expectedTaskId) return
    form.city = expected.city
    form.state = expected.state
    locationAutofillKey.value += 1
  }

  nextTick(() => {
    window.setTimeout(restoreExpectedLocation, 80)
    window.setTimeout(restoreExpectedLocation, 350)
    window.setTimeout(restoreExpectedLocation, 900)
  })
}

const DEFAULT_PROMPT_TEMPLATE = `Voce pesquisa oportunidades externas de compra para uma loja de materiais/construcao/zinco.
Procure sinais publicos atuais destes tipos: {sources}.
Use apenas produtos presentes na lista enviada. Nao invente produto, cliente, venda ou estoque.
Crie oportunidade somente se houver fonte publica e relacao plausivel com demanda do produto.
Salve contra-argumento real: por que a compra extra pode estar errada.
Nao recomende compra automatica. A resposta alimenta uma fila para aprovacao humana.
Base geografica da pesquisa: {location}.
Produtos enviados: {products_count}. Criterio de selecao: {selection_mode} ({products_limit}).`

const promptPreview = computed(() => {
  const sourcesText = form.sources.length
    ? form.sources.map((s: IntegrimCompraEventoTipo) => eventTypeLabels[s] || s).join(', ')
    : 'Nenhuma selecionada'
  const city = form.city.trim()
  const state = form.state.trim().toUpperCase()
  const location = [city, state].filter(Boolean).join(' - ') || 'Brasil'
  const modeLabel = productSelectionModes.find(m => m.value === form.productSelectionMode)?.label || form.productSelectionMode
  
  const template = form.customPromptEnabled && form.customPromptText.trim()
    ? form.customPromptText
    : DEFAULT_PROMPT_TEMPLATE

  let result = template
    .replace(/{sources}/g, sourcesText)
    .replace(/{location}/g, location)
    .replace(/{products_count}/g, String(previewList.value.length || 0))
    .replace(/{selection_mode}/g, modeLabel)
    .replace(/{products_limit}/g, String(form.productLimit))

  if (form.productsPerAiCall) {
    const batchSize = Number(form.productsPerAiCall)
    result = `[Loteamento Ativo: O lote de produtos será dividido em chamadas de no máximo ${batchSize} produtos por vez]\n\n` + result
  }
  
  return result
})

const applyTaskToForm = (task: IntegrimCompraAiTask | null) => {
  const schedule = (task?.params?.schedule && typeof task.params.schedule === 'object'
    ? task.params.schedule
    : parseCronToSchedule(task?.schedule_cron || '15 9,19 * * *')) as ScheduleConfig
  const productSelection = (task?.params?.product_selection && typeof task.params.product_selection === 'object'
    ? task.params.product_selection
    : {}) as ProductSelectionConfig
  const model = String(task?.params?.model || defaultAiModel)
  const productMode = String(productSelection.mode || 'top_score')

  form.id = task?.id || ''
  form.name = task?.name || `Pesquisa IA ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
  form.enabled = task?.enabled ?? true
  form.scheduleMode = schedule.mode === 'weekly' || schedule.mode === 'monthly' || schedule.mode === 'yearly'
    ? schedule.mode
    : 'daily'
  form.times = Array.isArray(schedule.times) && schedule.times.length ? schedule.times.map(String) : ['09:15']
  form.weekdays = Array.isArray(schedule.weekdays) && schedule.weekdays.length ? schedule.weekdays.map(Number) : [1, 2, 3, 4, 5]
  form.monthDay = String(schedule.month_day || 1)
  form.yearMonth = String(schedule.year_month || 1)
  form.yearDay = String(schedule.year_day || 1)
  form.timezone = task?.timezone || 'America/Sao_Paulo'
  form.city = getTaskLocation(task).city
  form.state = getTaskLocation(task).state
  form.rigor = confidenceToRigor(task?.params?.min_confidence)
  form.max_opportunities = String(task?.params?.max_opportunities ?? '20')
  form.model = isAiModelSupported(model) ? model : defaultAiModel
  form.productSelectionMode = isProductSelectionMode(productMode) ? productMode : 'top_score'
  form.productLimit = String(productSelection.limit || 50)
  form.idempresa = task?.params?.idempresa ? String(task.params.idempresa) : ''
  form.specificProductsText = Array.isArray(productSelection.specific_products)
    ? productSelection.specific_products.join('\n')
    : ''
  form.sources = Array.isArray(task?.params?.sources) && task.params.sources.length
    ? task.params.sources.filter((source: any): source is IntegrimCompraEventoTipo => eventTypes.includes(source as IntegrimCompraEventoTipo))
    : [...eventTypes]
  
  form.historyDateStart = task?.params?.history_date_start ? String(task.params.history_date_start) : ''
  form.historyDateEnd = task?.params?.history_date_end ? String(task.params.history_date_end) : ''
  form.coverageDays = task?.params?.coverage_days ? String(task.params.coverage_days) : '45'
  form.productsPerAiCall = task?.params?.products_per_ai_call ? String(task.params.products_per_ai_call) : ''
  form.customPromptText = task?.params?.custom_prompt ? String(task.params.custom_prompt) : ''
  form.customPromptEnabled = Boolean(task?.params?.custom_prompt)

  guardLocationAutofill(task)
}

watch(() => props.modelValue, (opened) => {
  if (opened) {
    applyTaskToForm(props.task)
    activeModalTab.value = 'geral'
  }
}, { immediate: true })

watch(() => props.task?.id, () => {
  if (props.modelValue) applyTaskToForm(props.task)
})

const toggleSource = (source: IntegrimCompraEventoTipo, checked: boolean) => {
  if (checked && !form.sources.includes(source)) form.sources = [...form.sources, source]
  else if (!checked) {
    const next = form.sources.filter((item: IntegrimCompraEventoTipo) => item !== source)
    form.sources = next.length ? next : [source]
  }
}

const toggleWeekday = (day: number) => {
  if (form.weekdays.includes(day)) {
    const next = form.weekdays.filter(value => value !== day)
    form.weekdays = next.length ? next : [day]
    return
  }
  form.weekdays = [...form.weekdays, day].sort((a, b) => a - b)
}

const addTime = () => {
  if (form.times.length >= 4) return
  form.times = [...form.times, '09:00']
}

const removeTime = (index: number) => {
  if (form.times.length <= 1) return
  form.times = form.times.filter((_, currentIndex) => currentIndex !== index)
}

const updateTime = (index: number, value: string) => {
  form.times = form.times.map((time, currentIndex) => currentIndex === index ? value : time)
}

const buildPayload = (): IntegrimCompraAiTaskUpsertRequest => {
  const city = form.city.trim()
  const state = form.state.trim().toUpperCase()
  const location = [city, state].filter(Boolean).join(' - ') || 'Brasil'

  return {
    name: form.name,
    enabled: form.enabled,
    schedule_cron: cronExpressions.value[0] || '15 9 * * *',
    timezone: form.timezone,
    params: {
      city,
      state,
      region: location,
      model: form.model,
      min_confidence: confidenceValue.value,
      max_opportunities: Number(form.max_opportunities || 20),
      sources: form.sources,
      idempresa: form.idempresa ? Number(form.idempresa) : null,
      history_date_start: form.historyDateStart ? form.historyDateStart : null,
      history_date_end: form.historyDateEnd ? form.historyDateEnd : null,
      coverage_days: form.coverageDays ? Number(form.coverageDays) : null,
      products_per_ai_call: form.productsPerAiCall ? Number(form.productsPerAiCall) : null,
      custom_prompt: form.customPromptEnabled && form.customPromptText.trim() ? form.customPromptText.trim() : null,
      product_selection: {
        mode: form.productSelectionMode,
        limit: Number(form.productLimit || 50),
        specific_products: cleanSpecificProducts.value,
      },
      schedule: {
        mode: form.scheduleMode,
        times: cleanTimes.value,
        weekdays: form.weekdays,
        month_day: Number(form.monthDay || 1),
        year_month: Number(form.yearMonth || 1),
        year_day: Number(form.yearDay || 1),
        crons: cronExpressions.value,
      },
    },
  }
}

const saveTask = () => {
  const payload = buildPayload()
  if (form.id) emit('updateTask', form.id, payload)
  else emit('createTask', payload)
}

const runTask = () => {
  emit('runTask', form.id || null)
}
</script>

<template>
  <ModalGlobal
    v-model="isOpen"
    :title="isEditing ? 'Editar task de IA' : 'Nova task de IA'"
    :description="isEditing ? 'Ajuste pesquisa, agenda e produtos usados pela IA.' : 'Configure uma nova pesquisa automática.'"
    max-width-class="max-w-3xl"
    content-class="p-5"
  >
    <form class="space-y-5" autocomplete="off" @submit.prevent="saveTask">
      <!-- Abas Internas do Modal -->
      <div class="flex border-b border-slate-200 dark:border-slate-800 gap-6 pb-1 overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          v-for="tab in modalTabs"
          :key="tab.id"
          type="button"
          class="pb-2.5 text-xs font-bold uppercase tracking-wider transition-all relative shrink-0 outline-none"
          :class="activeModalTab === tab.id ? 'text-brand-600 dark:text-brand-400 font-extrabold' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'"
          @click="activeModalTab = tab.id"
        >
          {{ tab.label }}
          <span v-if="activeModalTab === tab.id" class="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 dark:bg-brand-400 rounded-full" />
        </button>
      </div>

      <!-- ABA 1: GERAL & AGENDA -->
      <div v-show="activeModalTab === 'geral'" class="space-y-4 animate-fade-in">
        <!-- Nome & Status -->
        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_130px]">
          <label class="space-y-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Nome da Tarefa</span>
            <Input
              v-model="form.name"
              class="h-10"
              :disabled="!props.isAdmin"
              placeholder="ex: Pesquisa de oportunidades"
              autocomplete="off"
              name="ai-task-title"
            />
          </label>

          <label
            class="flex h-10 cursor-pointer items-center justify-center gap-2 self-end rounded-lg border px-3 text-sm font-semibold transition-colors"
            :class="form.enabled
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'"
          >
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
              :checked="form.enabled"
              :disabled="!props.isAdmin"
              @change="form.enabled = ($event.target as HTMLInputElement).checked"
            >
            {{ form.enabled ? 'Ativa' : 'Pausada' }}
          </label>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-3">
          <div class="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              <MapPin class="h-3.5 w-3.5" />
              Região da Pesquisa
            </span>
            <span class="truncate text-[11px] font-bold text-slate-500 dark:text-slate-300">{{ locationLabel }}</span>
          </div>

          <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Cidade</span>
              <Input
                :key="`city-${locationAutofillKey}`"
                v-model="form.city"
                class="h-10"
                :disabled="!props.isAdmin"
                placeholder="ex: Goiânia"
                type="search"
                autocomplete="one-time-code"
                name="ai-task-place-text"
              />
            </label>
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Estado</span>
              <SelectInput
                :key="`state-${locationAutofillKey}`"
                v-model="form.state"
                class="h-10"
                :disabled="!props.isAdmin"
                autocomplete="off"
                name="ai-task-place-uf"
              >
                <option value="">Brasil</option>
                <option v-for="state in stateOptions" :key="state" :value="state">
                  {{ state }}
                </option>
              </SelectInput>
            </label>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-4">
          <div class="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              <CalendarDays class="h-3.5 w-3.5" />
              Frequência de Execução
            </span>
            <span class="truncate text-[11px] font-bold text-slate-500 dark:text-slate-300">{{ scheduleSummary }}</span>
          </div>

          <!-- Modos de Agendamento -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="mode in scheduleModes"
              :key="mode.value"
              type="button"
              class="h-8 rounded-full border px-3.5 text-xs font-bold transition-all animate-fade-in"
              :class="form.scheduleMode === mode.value
                ? 'border-brand-500 bg-brand-50 text-brand-900 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200 shadow-sm'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900'"
              :disabled="!props.isAdmin"
              @click="form.scheduleMode = mode.value"
            >
              {{ mode.label }}
            </button>
          </div>

          <!-- Condicionais do Agendamento -->
          <div v-if="form.scheduleMode === 'weekly'" class="flex flex-wrap gap-2 animate-fade-in">
            <button
              v-for="day in weekDays"
              :key="day.value"
              type="button"
              class="h-8 rounded-full border px-3 text-xs font-bold transition-all"
              :class="form.weekdays.includes(day.value)
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 shadow-sm'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900'"
              :disabled="!props.isAdmin"
              @click="toggleWeekday(day.value)"
            >
              {{ day.label }}
            </button>
          </div>

          <div v-if="form.scheduleMode === 'monthly'" class="max-w-[140px] animate-fade-in">
            <label class="space-y-1.5 block">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Dia do Mês</span>
              <Input v-model="form.monthDay" type="number" min="1" max="31" step="1" class="h-9" :disabled="!props.isAdmin" />
            </label>
          </div>

          <div v-if="form.scheduleMode === 'yearly'" class="grid gap-3 sm:grid-cols-2 max-w-[280px] animate-fade-in">
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Mês</span>
              <SelectInput v-model="form.yearMonth" class="h-9" :disabled="!props.isAdmin">
                <option v-for="month in monthOptions" :key="month.value" :value="month.value">
                  {{ month.label }}
                </option>
              </SelectInput>
            </label>
            <label class="space-y-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Dia</span>
              <Input v-model="form.yearDay" type="number" min="1" max="31" step="1" class="h-9" :disabled="!props.isAdmin" />
            </label>
          </div>

          <!-- Horários -->
          <div class="space-y-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              <Clock3 class="h-3.5 w-3.5" />
              Horários de Disparo (máx. 4)
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
                :disabled="!props.isAdmin || form.times.length >= 4"
                @click="addTime"
              >
                + Horário
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ABA 2: FILTRO DE PRODUTOS -->
      <div v-show="activeModalTab === 'produtos'" class="space-y-4 animate-fade-in">
        <div class="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
          <!-- Coluna Esquerda: Configuração e Busca -->
          <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-4">
            <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <Search class="h-3.5 w-3.5" />
              Escopo de Seleção de Produtos
            </div>

            <div class="grid gap-4 sm:grid-cols-[minmax(0,2fr)_1fr_120px]">
              <label class="space-y-1.5 block">
                <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Critério de Priorização</span>
                <SelectInput v-model="form.productSelectionMode" class="h-10" :disabled="!props.isAdmin">
                  <option v-for="mode in productSelectionModes" :key="mode.value" :value="mode.value">
                    {{ mode.label }}
                  </option>
                </SelectInput>
                <span class="block text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">{{ productSelectionDescription }}</span>
              </label>

              <label class="space-y-1.5 block">
                <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Empresa</span>
                <SelectInput v-model="form.idempresa" class="h-10" :disabled="!props.isAdmin">
                  <option value="">Todas</option>
                  <option v-for="emp in [1, 2, 3, 4, 5, 6]" :key="emp" :value="String(emp)">Empresa {{ emp }}</option>
                </SelectInput>
              </label>

              <label class="space-y-1.5 block">
                <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Limite</span>
                <SelectInput v-model="form.productLimit" class="h-10" :disabled="!props.isAdmin">
                  <option v-for="limit in productLimitOptions" :key="limit" :value="limit">
                    {{ limit }} itens
                  </option>
                </SelectInput>
              </label>
            </div>

            <!-- Busca Autocomplete para Produtos Específicos -->
            <div v-if="form.productSelectionMode === 'specific'" class="space-y-3 animate-fade-in pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <div ref="searchContainerRef" class="space-y-1.5 block relative">
                <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Buscar Produto no Estoque</span>
                <div class="relative">
                  <Input
                    v-model="specificSearchQuery"
                    class="h-10 pr-8 text-xs"
                    placeholder="Digite o código ou descrição do produto..."
                    :disabled="!props.isAdmin"
                    autocomplete="off"
                    name="ai-task-search-product"
                    @focus="isDropdownOpen = true"
                    @click="isDropdownOpen = true"
                  />
                  <div v-if="loadingSearch" class="absolute right-3 top-3">
                    <Loader2 class="h-3.5 w-3.5 animate-spin text-brand-500" />
                  </div>
                </div>

                <!-- Dropdown de Resultados da Busca -->
                <div
                  v-if="isDropdownOpen && searchResults.length"
                  class="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950"
                >
                  <button
                    v-for="prod in searchResults"
                    :key="`${prod.idempresa}-${prod.idproduto}-${prod.idsubproduto}`"
                    type="button"
                    class="w-full px-4 py-2.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-900/60 border-b border-slate-100 last:border-0 dark:border-slate-800 flex items-center justify-between gap-4"
                    @click="addSpecificProduct(prod)"
                  >
                    <div class="min-w-0">
                      <div class="font-bold text-slate-900 dark:text-slate-100 truncate">{{ prod.descrcomproduto || prod.descricao || 'Sem descrição' }}</div>
                      <div class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                        Empresa {{ prod.idempresa }} • Cód. {{ prod.idproduto }}/{{ prod.idsubproduto }}
                      </div>
                    </div>
                    <span class="shrink-0 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-extrabold text-slate-600 dark:text-slate-400">
                      Estoque: {{ formatStockIntegrinNumber(prod.qtdsaldodisponivel, 0) }}
                    </span>
                  </button>
                </div>
              </div>

              <!-- Lista de Tags Selecionadas -->
              <div class="space-y-1.5">
                <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Produtos Selecionados ({{ cleanSpecificProducts.length }})</span>
                <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg border border-slate-200/60 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20">
                  <span
                    v-for="code in cleanSpecificProducts"
                    :key="code"
                    class="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <span class="truncate max-w-[100px] sm:max-w-[200px]" :title="selectedProductsMap[code] || code">
                      {{ selectedProductsMap[code] || code }}
                    </span>
                    <button
                      v-if="props.isAdmin"
                      type="button"
                      class="hover:text-rose-500 font-bold ml-1 text-xs px-0.5"
                      @click="removeSpecificProduct(code)"
                    >
                      ×
                    </button>
                  </span>
                  <span v-if="!cleanSpecificProducts.length" class="text-xs text-slate-400 dark:text-slate-500 italic p-1">
                    Nenhum produto adicionado ainda. Use a busca acima.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Coluna Direita: Prévia da Lista de Produtos -->
          <div class="rounded-xl border border-slate-200 bg-slate-50/30 p-4 dark:border-slate-800 dark:bg-slate-950/20 flex flex-col h-[380px] min-w-0">
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2 mb-3 shrink-0">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">
                Produtos na Análise ({{ previewList.length }} / {{ form.productLimit }})
              </span>
              <div v-if="loadingPreview" class="shrink-0">
                <Loader2 class="h-3.5 w-3.5 animate-spin text-brand-500" />
              </div>
            </div>

            <!-- Lista Rolável -->
            <div class="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
              <div
                v-for="(prod, idx) in previewList"
                :key="`${prod.idempresa}-${prod.idproduto}-${prod.idsubproduto}`"
                class="p-2.5 rounded-lg border border-slate-200/50 bg-white dark:border-slate-800 dark:bg-slate-900/40 hover:bg-slate-50/40 dark:hover:bg-slate-900/60 transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div class="min-w-0">
                  <div class="font-bold text-slate-800 dark:text-slate-200 truncate" :title="prod.descricao || ''">
                    {{ idx + 1 }}. {{ prod.descricao || 'Sem descrição' }}
                  </div>
                  <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Empresa {{ prod.idempresa }} • Cód. {{ prod.idproduto }}/{{ prod.idsubproduto }}
                  </div>
                </div>
                
                <span class="shrink-0 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-extrabold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {{ getMetricLabel(prod) }}
                </span>
              </div>
              
              <div v-if="!previewList.length && !loadingPreview" class="h-full flex flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500 italic text-center p-4">
                Selecione critérios ou adicione produtos específicos para visualizar a prévia.
              </div>
            </div>
            
            <!-- Nota em Modo Aleatório -->
            <div v-if="form.productSelectionMode === 'random' && previewList.length" class="mt-2.5 shrink-0 text-[10px] text-slate-400 dark:text-slate-500 italic border-t border-slate-100 dark:border-slate-800/60 pt-2 leading-relaxed">
              * Nota: A IA selecionará e embaralhará aleatoriamente estes itens a cada execução.
            </div>
          </div>
        </div>
      </div>

      <!-- ABA 3: PARÂMETROS IA -->
      <div v-show="activeModalTab === 'ia'" class="space-y-4 animate-fade-in max-h-[500px] overflow-y-auto pr-1">
        <!-- Modelo de IA & Rigor -->
        <div class="grid gap-4 md:grid-cols-2">
          <label class="space-y-1.5">
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              <SlidersHorizontal class="h-3.5 w-3.5" />
              Modelo de Linguagem (LLM)
            </span>
            <SelectInput v-model="form.model" class="h-10" :disabled="!props.isAdmin">
              <option v-for="model in aiModelOptions" :key="model.id" :value="model.id">
                {{ model.label }}
              </option>
            </SelectInput>
            <span class="block text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">{{ selectedModelDescription }}</span>
          </label>

          <div class="space-y-3">
            <label class="space-y-1.5 block">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Nível de Rigor do Resultado</span>
              <SelectInput v-model="form.rigor" class="h-10" :disabled="!props.isAdmin">
                <option v-for="option in rigorOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </SelectInput>
            </label>

            <label class="space-y-1.5 block">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Volume Máximo de Oportunidades</span>
              <SelectInput v-model="form.max_opportunities" class="h-10" :disabled="!props.isAdmin">
                <option v-for="option in maxOpportunityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </SelectInput>
            </label>
          </div>
        </div>

        <!-- Seção 2: Período de Pesquisa & Loteamento (Subagentes) -->
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-4">
          <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/60 pb-2">Configuração de Histórico e Loteamento</span>
          
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1.5 block">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Início do Período Histórico</span>
              <Input v-model="form.historyDateStart" type="date" class="h-10" :disabled="!props.isAdmin" />
            </label>
            <label class="space-y-1.5 block">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Fim do Período Histórico</span>
              <Input v-model="form.historyDateEnd" type="date" class="h-10" :disabled="!props.isAdmin" />
            </label>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1.5 block">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Dias de Cobertura de Estoque</span>
              <Input v-model="form.coverageDays" type="number" min="1" max="365" step="1" class="h-10" :disabled="!props.isAdmin" />
              <span class="block text-[11px] text-slate-400 mt-1 leading-normal font-medium">Intervalo de segurança utilizado para sugerir compras extras (padrão: 45).</span>
            </label>
            <label class="space-y-1.5 block">
              <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Produtos por Chamada de IA (Subagentes)</span>
              <SelectInput v-model="form.productsPerAiCall" class="h-10" :disabled="!props.isAdmin">
                <option value="">Todos em uma única chamada</option>
                <option value="1">1 produto por chamada (Análise Individual)</option>
                <option value="2">2 produtos por chamada</option>
                <option value="3">3 produtos por chamada</option>
                <option value="5">5 produtos por chamada</option>
                <option value="10">10 produtos por chamada</option>
                <option value="20">20 produtos por chamada</option>
              </SelectInput>
              <span class="block text-[11px] text-slate-400 mt-1 leading-normal font-medium">Selecione para loteamento e processamento detalhado de produtos.</span>
            </label>
          </div>
        </div>

        <!-- Fontes -->
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-3">
          <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/60 pb-2">Fontes de Informação Externas</span>
          <div class="flex flex-wrap gap-2 pt-1">
            <label
              v-for="source in eventTypes"
              :key="source"
              class="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-bold transition-all select-none"
              :class="form.sources.includes(source)
                ? 'border-brand-500 bg-brand-50 text-brand-900 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200 shadow-sm'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900'"
            >
              <input
                type="checkbox"
                class="sr-only"
                :checked="form.sources.includes(source)"
                :disabled="!props.isAdmin"
                @change="toggleSource(source, ($event.target as HTMLInputElement).checked)"
              >
              <Check v-if="form.sources.includes(source)" class="h-3.5 w-3.5" />
              {{ eventTypeLabels[source] }}
            </label>
          </div>
        </div>

        <!-- Customização de Instruções do Prompt -->
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Instruções e Prompt da IA</span>
            <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer dark:text-slate-300">
              <input
                type="checkbox"
                v-model="form.customPromptEnabled"
                class="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
                :disabled="!props.isAdmin"
              />
              Personalizar Prompt
            </label>
          </div>

          <div v-if="form.customPromptEnabled" class="space-y-2 animate-fade-in">
            <textarea
              v-model="form.customPromptText"
              class="w-full h-40 p-3 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:ring-1 focus:ring-brand-500 outline-none leading-relaxed"
              :disabled="!props.isAdmin"
              placeholder="Digite as instruções do prompt usando as tags {sources}, {location}, {products_count}, {selection_mode}, {products_limit}..."
            />
            <span class="block text-[10.5px] text-slate-300 leading-relaxed font-semibold">
              Dica: Você pode utilizar placeholders dinâmicos que serão substituídos no pragmatismo: <br />
              <code class="text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/60 font-mono">{sources}</code> (fontes ativas), 
              <code class="text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/60 font-mono">{location}</code> (cidade/estado), 
              <code class="text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/60 font-mono">{products_count}</code> (total produtos), 
              <code class="text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/60 font-mono">{selection_mode}</code> (critério), 
              <code class="text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/60 font-mono">{products_limit}</code> (limite).
            </span>
          </div>

          <!-- Prévia final do Prompt -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Visualização do Prompt Gerado (Prompt Final)</span>
            <pre class="w-full max-h-48 overflow-y-auto p-3.5 rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 text-[11px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-all">{{ promptPreview }}</pre>
          </div>
        </div>

        <!-- Seção de Permissões da IA -->
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-950/20 space-y-2">
          <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">Escopo e Permissões de Segurança da IA</span>
          <ul class="text-[11.5px] text-slate-300 dark:text-slate-400 list-disc list-inside space-y-1 leading-relaxed font-semibold">
            <li><strong>Ferramentas de Navegação:</strong> Permissão para usar <code class="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-sky-400 font-mono">Google Search</code> para ler notícias regionais e sinalizadores.</li>
            <li><strong>Acesso a Dados:</strong> Acesso somente-leitura ao histórico de vendas, saldo de estoque e preços de custo da Zincão.</li>
            <li><strong>Sem Escrita Direta:</strong> A IA não possui permissões para cadastrar compras ou alterar dados diretamente; ela apenas sugere oportunidades na fila de aprovação.</li>
          </ul>
        </div>
      </div>

      <!-- RODAPÉ DE AÇÕES -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div>
          <span v-if="taskIsLocked" class="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <Loader2 class="h-4 w-4 animate-spin" />
            Em execução pela IA...
          </span>
          <span v-else class="text-xs text-slate-500 dark:text-slate-400">
            A IA não cria compras automaticamente.
          </span>
        </div>

        <div class="flex items-center gap-2">
          <Botao type="submit" variant="secondary" :disabled="props.actionLoading || !props.isAdmin">
            <Save class="h-4 w-4" />
            Salvar
          </Botao>
          <Botao v-if="isEditing" type="button" variant="accent" :disabled="!canRunSelectedTask" @click="runTask">
            <Play class="h-4 w-4" />
            Rodar agora
          </Botao>
        </div>
      </div>
    </form>
  </ModalGlobal>
</template>
