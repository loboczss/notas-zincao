import type {
  IntegrimNotasSyncProgress,
  IntegrimNotasSyncProgressPhase,
} from './types'

export const digitsOnly = (value: unknown) => String(value ?? '').replace(/\D/g, '')

export const trimmedOrNull = (value: unknown) => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

// Integrim devolve datas como 'YYYY-MM-DD' (com ou sem hora). Normaliza para date.
export const normalizeDate = (value: unknown): string | null => {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

export const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10)

// Janela movel: [hoje - meses, hoje]. dtmovimento futuro fica fora.
export const getWindowRange = (windowMonths: number, now = new Date()) => {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const start = new Date(end)
  start.setUTCMonth(start.getUTCMonth() - Math.max(1, windowMonths))
  return {
    startDate: formatIsoDate(start),
    endDate: formatIsoDate(end),
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const parseIsoDate = (value: unknown): string | null => {
  const raw = String(value ?? '').trim()
  if (!ISO_DATE.test(raw)) return null
  const time = Date.parse(`${raw}T00:00:00Z`)
  return Number.isFinite(time) ? raw : null
}

// Resolve a janela de sincronizacao: um intervalo de datas explicito (escolhido
// no front) tem prioridade sobre a janela movel por meses. Datas no futuro sao
// recortadas para hoje (nao existem vendas futuras a sincronizar).
export const resolveSyncRange = (
  startDate: unknown,
  endDate: unknown,
  windowMonths: number,
  now = new Date(),
): { startDate: string, endDate: string } => {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  if (start && end && start <= end) {
    const today = formatIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())))
    return { startDate: start, endDate: end > today ? today : end }
  }
  return getWindowRange(windowMonths, now)
}

export const buildProgress = (input: {
  phase: IntegrimNotasSyncProgressPhase
  totalPages: number
  processedPages: number
  notasTotal: number
  itensTotal: number
  upsertedRows: number
  deactivatedRows: number
  currentCompany?: number | null
  currentModelo?: string | null
  currentPage?: number | null
  message: string
}): IntegrimNotasSyncProgress => {
  const denominator = Math.max(input.totalPages, 1)
  const rawPercent = input.phase === 'done'
    ? 100
    : input.phase === 'cancelled' || input.phase === 'failed'
      ? Math.min(100, Math.max(0, (input.processedPages / denominator) * 100))
      : Math.min(99, Math.max(1, (input.processedPages / denominator) * 100))

  return {
    phase: input.phase,
    total_pages: input.totalPages,
    processed_pages: input.processedPages,
    notas_total: input.notasTotal,
    itens_total: input.itensTotal,
    upserted_rows: input.upsertedRows,
    deactivated_rows: input.deactivatedRows,
    current_company: input.currentCompany ?? null,
    current_modelo: input.currentModelo ?? null,
    current_page: input.currentPage ?? null,
    progress_percent: Number(rawPercent.toFixed(1)),
    message: input.message,
    updated_at: new Date().toISOString(),
  }
}
