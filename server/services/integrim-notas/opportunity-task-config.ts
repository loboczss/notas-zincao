import type {
  IntegrimCompraAiTask,
  IntegrimCompraAiTaskParams,
  IntegrimCompraAiTaskUpsertRequest,
  IntegrimCompraEventoTipo,
  IntegrimCompraProdutoSelectionMode,
} from '../../../shared/types/IntegrimNotas'
import {
  DEFAULT_OPENAI_MODEL,
  isOpenAIModelSupported,
} from '../../../shared/constants/OpenAIModels'

const EVENT_TYPES: IntegrimCompraEventoTipo[] = [
  'clima',
  'cidade',
  'esporte',
  'feriado',
  'obra',
  'tendencia',
  'fornecedor',
]

const EVENT_TYPE_SET = new Set(EVENT_TYPES)
const PRODUCT_SELECTION_MODES = new Set<IntegrimCompraProdutoSelectionMode>([
  'top_score',
  'top_revenue',
  'top_margin',
  'top_quantity',
  'random',
  'specific',
])

const numberValue = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const nullableString = (value: unknown) => {
  const text = String(value ?? '').trim()
  return text || null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const objectValue = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

const sanitizeText = (value: unknown, fallback: string, maxLength: number) => {
  const text = String(value ?? '').trim()
  return (text || fallback).slice(0, maxLength)
}

const sanitizeSources = (value: unknown, fallback: IntegrimCompraEventoTipo[] = EVENT_TYPES) => {
  if (!Array.isArray(value)) return fallback
  const sources = value
    .map(source => String(source || '').trim() as IntegrimCompraEventoTipo)
    .filter(source => EVENT_TYPE_SET.has(source))
  return sources.length ? [...new Set(sources)] : fallback
}

const sanitizeModel = (value: unknown, fallback: unknown = DEFAULT_OPENAI_MODEL) => {
  const candidate = String(value ?? '').trim()
  if (candidate && isOpenAIModelSupported(candidate)) return candidate

  const fallbackCandidate = String(fallback ?? '').trim()
  return isOpenAIModelSupported(fallbackCandidate) ? fallbackCandidate : DEFAULT_OPENAI_MODEL
}

const sanitizeTime = (value: unknown) => {
  const raw = String(value ?? '').trim()
  return /^\d{2}:\d{2}$/.test(raw) ? raw : null
}

const sanitizeSchedule = (value: unknown, fallback: unknown) => {
  const input = objectValue(value)
  const fallbackInput = objectValue(fallback)
  const mode = String(input.mode || fallbackInput.mode || 'daily')
  const cleanMode: 'daily' | 'weekly' | 'monthly' | 'yearly' = mode === 'weekly' || mode === 'monthly' || mode === 'yearly' ? mode : 'daily'
  const times = (Array.isArray(input.times) ? input.times : Array.isArray(fallbackInput.times) ? fallbackInput.times : ['09:15', '19:15'])
    .map(sanitizeTime)
    .filter((time): time is string => Boolean(time))
  const weekdays = (Array.isArray(input.weekdays) ? input.weekdays : Array.isArray(fallbackInput.weekdays) ? fallbackInput.weekdays : [1, 2, 3, 4, 5])
    .map(day => Math.trunc(numberValue(day, 1)))
    .filter(day => day >= 0 && day <= 6)

  const crons = (Array.isArray(input.crons) ? input.crons : Array.isArray(fallbackInput.crons) ? fallbackInput.crons : [])
    .map(cron => sanitizeText(cron, '', 120))
    .filter(Boolean)

  return {
    mode: cleanMode,
    times: times.length ? [...new Set(times)] : ['09:15'],
    weekdays: weekdays.length ? [...new Set(weekdays)] : [1, 2, 3, 4, 5],
    month_day: Math.trunc(clamp(numberValue(input.month_day ?? fallbackInput.month_day, 1), 1, 31)),
    year_month: Math.trunc(clamp(numberValue(input.year_month ?? fallbackInput.year_month, 1), 1, 12)),
    year_day: Math.trunc(clamp(numberValue(input.year_day ?? fallbackInput.year_day, 1), 1, 31)),
    crons,
  }
}

const sanitizeState = (value: unknown, fallback: unknown = '') => {
  return sanitizeText(value ?? fallback, '', 2).toUpperCase()
}

const sanitizeSpecificProducts = (value: unknown, fallback: unknown = []) => {
  const input = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : []
  const products = input
    .map(item => sanitizeText(item, '', 80))
    .filter(Boolean)
  return [...new Set(products)].slice(0, 1000)
}

const sanitizeProductSelection = (value: unknown, fallback: unknown) => {
  const input = objectValue(value)
  const fallbackInput = objectValue(fallback)
  const modeInput = String(input.mode || fallbackInput.mode || 'top_score') as IntegrimCompraProdutoSelectionMode
  const mode = PRODUCT_SELECTION_MODES.has(modeInput) ? modeInput : 'top_score'

  return {
    mode,
    limit: Math.trunc(clamp(numberValue(input.limit ?? fallbackInput.limit, 50), 1, 1000)),
    specific_products: sanitizeSpecificProducts(input.specific_products, fallbackInput.specific_products),
  }
}

export const sanitizeCompraTaskPayload = (
  body: IntegrimCompraAiTaskUpsertRequest | null | undefined,
  currentParams: Record<string, unknown> = {},
) => {
  const paramsInput = objectValue(body?.params)
  const mergedParams: IntegrimCompraAiTaskParams = {
    ...currentParams,
    ...paramsInput,
    city: sanitizeText(paramsInput.city ?? currentParams.city, '', 80),
    state: sanitizeState(paramsInput.state, currentParams.state),
    region: sanitizeText(paramsInput.region ?? currentParams.region, 'Brasil', 140),
    model: sanitizeModel(paramsInput.model, currentParams.model),
    min_confidence: clamp(numberValue(paramsInput.min_confidence ?? currentParams.min_confidence, 0.62), 0, 1),
    max_opportunities: Math.trunc(clamp(numberValue(paramsInput.max_opportunities ?? currentParams.max_opportunities, 20), 1, 50)),
    sources: sanitizeSources(paramsInput.sources ?? currentParams.sources),
    product_selection: sanitizeProductSelection(paramsInput.product_selection, currentParams.product_selection),
    schedule: sanitizeSchedule(paramsInput.schedule, currentParams.schedule),
  }

  return {
    name: sanitizeText(body?.name, 'Pesquisa diaria de oportunidades de compra', 140),
    enabled: body?.enabled === false ? false : true,
    schedule_cron: sanitizeText(body?.schedule_cron, '15 9,19 * * *', 240),
    timezone: sanitizeText(body?.timezone, 'America/Sao_Paulo', 80),
    params: mergedParams,
  }
}

export const mapCompraAiTask = (row: Record<string, unknown>): IntegrimCompraAiTask => ({
  id: String(row.id),
  name: String(row.name || ''),
  task_type: 'opportunity_research',
  enabled: row.enabled !== false,
  schedule_cron: String(row.schedule_cron || '15 9,19 * * *'),
  timezone: String(row.timezone || 'America/Sao_Paulo'),
  next_run_at: nullableString(row.next_run_at),
  locked_at: nullableString(row.locked_at),
  last_run_at: nullableString(row.last_run_at),
  last_success_at: nullableString(row.last_success_at),
  params: objectValue(row.params),
  created_at: String(row.created_at || ''),
  updated_at: String(row.updated_at || ''),
})
