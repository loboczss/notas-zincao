import type {
  IntegrimSyncSchedule,
  IntegrimSyncScheduleUpdateRequest,
} from '../../../shared/types/IntegrimNotas'

export const SYNC_SCHEDULE_TABLE = 'integrim_sync_schedule'

const DEFAULT_TIMEZONE = 'America/Sao_Paulo'
const DEFAULT_TIMES = ['03:00']
const DEFAULT_WINDOW_MONTHS = 24
const MAX_TIMES = 6

type AdminClient = {
  from: (table: string) => any
}

const sanitizeTime = (value: unknown) => {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!match) return null
  return `${match[1]!.padStart(2, '0')}:${match[2]}`
}

export const sanitizeScheduleTimes = (value: unknown): string[] => {
  const list = Array.isArray(value) ? value : []
  const cleaned = list
    .map(sanitizeTime)
    .filter((time): time is string => Boolean(time))
  const unique = [...new Set(cleaned)].sort()
  return unique.length ? unique.slice(0, MAX_TIMES) : [...DEFAULT_TIMES]
}

export const normalizeTimezone = (value: unknown): string => {
  const candidate = String(value || DEFAULT_TIMEZONE).trim() || DEFAULT_TIMEZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date())
    return candidate
  }
  catch {
    return DEFAULT_TIMEZONE
  }
}

const clampWindowMonths = (value: unknown): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_WINDOW_MONTHS
  return Math.min(120, Math.max(1, Math.trunc(parsed)))
}

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return fallback
  return !['0', 'false', 'nao', 'não', 'no', 'off'].includes(normalized)
}

// Converte horario local (HH:MM no fuso) para o proximo instante UTC futuro.
const getZonedParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const values = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  }
}

const localTimeToUtc = (
  parts: { year: number, month: number, day: number },
  hour: number,
  minute: number,
  timeZone: string,
) => {
  let candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute))
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getZonedParts(candidate, timeZone)
    const actualMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute)
    const targetMs = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute)
    candidate = new Date(candidate.getTime() - (actualMs - targetMs))
  }
  return candidate
}

export const getNextSyncRunAt = (
  times: string[],
  timeZone: string,
  after: Date = new Date(),
): Date | null => {
  const cleanTimes = sanitizeScheduleTimes(times)
  if (!cleanTimes.length) return null

  const reference = new Date(after.getTime() + 1000)
  const startLocal = getZonedParts(reference, timeZone)
  let best: Date | null = null

  for (let offset = 0; offset <= 2; offset += 1) {
    const dayMs = Date.UTC(startLocal.year, startLocal.month - 1, startLocal.day + offset)
    const day = new Date(dayMs)
    const dayParts = { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() }

    for (const time of cleanTimes) {
      const [hourRaw, minuteRaw] = time.split(':')
      const candidate = localTimeToUtc(dayParts, Number(hourRaw), Number(minuteRaw), timeZone)
      if (candidate.getTime() > reference.getTime() && (!best || candidate.getTime() < best.getTime())) {
        best = candidate
      }
    }
  }

  return best
}

export const buildSyncSchedule = (
  row: Record<string, unknown> | null,
): IntegrimSyncSchedule => {
  const times = sanitizeScheduleTimes(row?.times)
  const timezone = normalizeTimezone(row?.timezone)
  const enabled = row ? parseBoolean(row.enabled, true) : true
  const next = enabled ? getNextSyncRunAt(times, timezone) : null

  return {
    enabled,
    times,
    window_months: clampWindowMonths(row?.window_months),
    timezone,
    deactivate_stale: row ? parseBoolean(row.deactivate_stale, true) : true,
    updated_at: row?.updated_at ? String(row.updated_at) : null,
    updated_by: row?.updated_by ? String(row.updated_by) : null,
    next_run_at: next ? next.toISOString() : null,
  }
}

export const loadSyncSchedule = async (client: AdminClient): Promise<IntegrimSyncSchedule> => {
  const { data, error } = await client
    .from(SYNC_SCHEDULE_TABLE)
    .select('*')
    .eq('id', true)
    .maybeSingle()

  if (error) {
    console.error('[integrim-notas:sync-schedule] failed to load schedule:', error.message)
    return buildSyncSchedule(null)
  }

  return buildSyncSchedule((data as Record<string, unknown>) || null)
}

export const sanitizeScheduleUpdate = (
  body: IntegrimSyncScheduleUpdateRequest,
): Record<string, unknown> => {
  const values: Record<string, unknown> = {}
  if (body.enabled !== undefined) values.enabled = parseBoolean(body.enabled, true)
  if (body.times !== undefined) values.times = sanitizeScheduleTimes(body.times)
  if (body.window_months !== undefined) values.window_months = clampWindowMonths(body.window_months)
  if (body.timezone !== undefined) values.timezone = normalizeTimezone(body.timezone)
  if (body.deactivate_stale !== undefined) values.deactivate_stale = parseBoolean(body.deactivate_stale, true)
  return values
}
