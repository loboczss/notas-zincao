import type {
  IntegrimRecord,
  StockIntegrinSyncProgress,
  StockIntegrinSyncProgressPhase,
} from './types'
import { IntegrimHttpError } from './types'

export const normalizeBaseUrl = (value?: string) => String(value || '').trim().replace(/\/+$/, '')

export const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return null

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export const toInteger = (value: unknown): number | null => {
  const parsed = toNumber(value)
  return parsed === null ? null : Math.trunc(parsed)
}

export const parsePositiveInteger = (value: unknown) => {
  const parsed = toInteger(value)
  return parsed && parsed > 0 ? parsed : null
}

export const normalizeCompanyIds = (values: unknown, fallback: number[]) => {
  if (!Array.isArray(values)) return fallback

  const ids = values
    .map(item => parsePositiveInteger(item))
    .filter((item): item is number => item !== null)

  return ids.length ? [...new Set(ids)] : fallback
}

export const stringOrNull = (value: unknown) => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

export const timestampOrNull = (value: unknown) => {
  const text = stringOrNull(value)
  if (!text) return null
  return text
}

export const maxTimestamp = (...values: Array<unknown>) => {
  let selected: string | null = null
  let selectedTime = -Infinity

  for (const value of values) {
    const text = timestampOrNull(value)
    if (!text) continue

    const time = Date.parse(text.replace(' ', 'T'))
    if (Number.isFinite(time) && time > selectedTime) {
      selected = text
      selectedTime = time
    }
  }

  return selected
}

export const sourceKey = (row: IntegrimRecord) => {
  const idproduto = toInteger(row.idproduto)
  const idsubproduto = toInteger(row.idsubproduto)
  if (!idproduto || !idsubproduto) return null
  return `${idproduto}:${idsubproduto}`
}

export const sameSourceKey = (left: IntegrimRecord | null | undefined, right: IntegrimRecord | null | undefined) => {
  const leftCompany = toInteger(left?.idempresa)
  const rightCompany = toInteger(right?.idempresa)
  const leftKey = left ? sourceKey(left) : null
  const rightKey = right ? sourceKey(right) : null

  return Boolean(leftCompany && rightCompany && leftCompany === rightCompany && leftKey && leftKey === rightKey)
}

export const priceKey = (row: IntegrimRecord) => {
  const idempresa = toInteger(row.idempresa)
  const key = sourceKey(row)
  if (!idempresa || !key) return null
  return `${idempresa}:${key}`
}

export const addUniqueKeys = (
  set: Set<string>,
  rows: IntegrimRecord[],
  getKey: (row: IntegrimRecord) => string | null,
) => {
  for (const row of rows) {
    const key = getKey(row)
    if (key) set.add(key)
  }
}

export const chunk = <T>(items: T[], chunkSize: number) => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

export const yieldToEventLoop = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
}

export const normalizeSyncErrorMessage = (error: unknown) => {
  if (error instanceof IntegrimHttpError) {
    return error.message.slice(0, 1000)
  }

  if (error instanceof Error) {
    return error.message.slice(0, 1000)
  }

  return String(error || 'Erro desconhecido').slice(0, 1000)
}

export const buildProgress = (input: {
  phase: StockIntegrinSyncProgressPhase
  totalPages: number
  processedPages: number
  totalSaldosEstimated: number
  processedSaldos: number
  upsertedRows: number
  deactivatedRows: number
  currentCompany?: number | null
  currentPage?: number | null
  message: string
}): StockIntegrinSyncProgress => {
  const denominator = Math.max(input.totalPages, 1)
  const rawPercent = input.phase === 'done'
    ? 100
    : input.phase === 'cancelled'
      ? Math.min(100, Math.max(0, (input.processedPages / denominator) * 100))
    : input.phase === 'failed'
      ? Math.min(100, Math.max(0, (input.processedPages / denominator) * 100))
      : Math.min(99, Math.max(1, (input.processedPages / denominator) * 100))

  return {
    phase: input.phase,
    total_pages: input.totalPages,
    processed_pages: input.processedPages,
    total_saldos_estimated: input.totalSaldosEstimated,
    processed_saldos: input.processedSaldos,
    upserted_rows: input.upsertedRows,
    deactivated_rows: input.deactivatedRows,
    current_company: input.currentCompany ?? null,
    current_page: input.currentPage ?? null,
    progress_percent: Number(rawPercent.toFixed(1)),
    message: input.message,
    updated_at: new Date().toISOString(),
  }
}
