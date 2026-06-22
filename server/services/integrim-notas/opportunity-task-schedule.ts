type ScheduleMode = 'daily' | 'weekly' | 'monthly' | 'yearly'

type ScheduleConfig = {
  mode: ScheduleMode
  times: string[]
  weekdays: number[]
  month_day: number
  year_month: number
  year_day: number
}

const DEFAULT_TIMEZONE = 'America/Sao_Paulo'
const DEFAULT_SCHEDULE: ScheduleConfig = {
  mode: 'daily',
  times: ['09:15', '19:15'],
  weekdays: [1, 2, 3, 4, 5],
  month_day: 1,
  year_month: 1,
  year_day: 1,
}

const numberValue = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const objectValue = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

const sanitizeTime = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!/^\d{2}:\d{2}$/.test(raw)) return null

  const [hourRaw, minuteRaw] = raw.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return raw
}

const normalizeTimezone = (timezone: unknown) => {
  const candidate = String(timezone || DEFAULT_TIMEZONE).trim() || DEFAULT_TIMEZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date())
    return candidate
  }
  catch {
    return DEFAULT_TIMEZONE
  }
}

const normalizeSchedule = (params: Record<string, unknown>): ScheduleConfig => {
  const schedule = objectValue(params.schedule)
  const modeValue = String(schedule.mode || DEFAULT_SCHEDULE.mode)
  const mode: ScheduleMode = modeValue === 'weekly' || modeValue === 'monthly' || modeValue === 'yearly'
    ? modeValue
    : 'daily'

  const times = (Array.isArray(schedule.times) ? schedule.times : DEFAULT_SCHEDULE.times)
    .map(sanitizeTime)
    .filter((time): time is string => Boolean(time))
    .sort()

  const weekdays = (Array.isArray(schedule.weekdays) ? schedule.weekdays : DEFAULT_SCHEDULE.weekdays)
    .map(day => Math.trunc(numberValue(day, 1)))
    .filter(day => day >= 0 && day <= 6)
    .sort((a, b) => a - b)

  return {
    mode,
    times: [...new Set(times.length ? times : DEFAULT_SCHEDULE.times)],
    weekdays: [...new Set(weekdays.length ? weekdays : DEFAULT_SCHEDULE.weekdays)],
    month_day: Math.trunc(clamp(numberValue(schedule.month_day, DEFAULT_SCHEDULE.month_day), 1, 31)),
    year_month: Math.trunc(clamp(numberValue(schedule.year_month, DEFAULT_SCHEDULE.year_month), 1, 12)),
    year_day: Math.trunc(clamp(numberValue(schedule.year_day, DEFAULT_SCHEDULE.year_day), 1, 31)),
  }
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

const getFormatter = (timezone: string) => {
  const cached = formatterCache.get(timezone)
  if (cached) return cached

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  formatterCache.set(timezone, formatter)
  return formatter
}

const getZonedParts = (date: Date, timezone: string) => {
  const values = Object.fromEntries(
    getFormatter(timezone).formatToParts(date).map(part => [part.type, part.value]),
  )
  const year = Number(values.year)
  const month = Number(values.month)
  const day = Number(values.day)
  const hour = Number(values.hour)
  const minute = Number(values.minute)
  const second = Number(values.second)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()

  return { year, month, day, hour, minute, second, weekday }
}

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

const addDays = (parts: { year: number, month: number, day: number }, days: number) => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

const localDateMatches = (
  schedule: ScheduleConfig,
  parts: { year: number, month: number, day: number, weekday: number },
) => {
  if (schedule.mode === 'weekly') return schedule.weekdays.includes(parts.weekday)
  if (schedule.mode === 'monthly') return parts.day === Math.min(schedule.month_day, daysInMonth(parts.year, parts.month))
  if (schedule.mode === 'yearly') {
    if (parts.month !== schedule.year_month) return false
    return parts.day === Math.min(schedule.year_day, daysInMonth(parts.year, schedule.year_month))
  }
  return true
}

const localDateTimeToUtc = (
  parts: { year: number, month: number, day: number },
  time: string,
  timezone: string,
) => {
  const [hourRaw = '0', minuteRaw = '0'] = time.split(':')
  const target = {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(hourRaw),
    minute: Number(minuteRaw),
  }

  let candidate = new Date(Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute))
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getZonedParts(candidate, timezone)
    const actualLocalMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute)
    const targetLocalMs = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute)
    candidate = new Date(candidate.getTime() - (actualLocalMs - targetLocalMs))
  }

  const actual = getZonedParts(candidate, timezone)
  if (
    actual.year !== target.year
    || actual.month !== target.month
    || actual.day !== target.day
    || actual.hour !== target.hour
    || actual.minute !== target.minute
  ) {
    return null
  }

  return candidate
}

export const getNextCompraTaskRunAt = (
  paramsInput: unknown,
  timezoneInput: unknown,
  afterInput: Date = new Date(),
) => {
  const params = objectValue(paramsInput)
  const timezone = normalizeTimezone(timezoneInput)
  const schedule = normalizeSchedule(params)
  const after = new Date(afterInput.getTime() + 60 * 1000)
  const startLocal = getZonedParts(after, timezone)

  for (let offset = 0; offset <= 370; offset += 1) {
    const localDate = addDays(startLocal, offset)
    const localParts = {
      ...localDate,
      weekday: new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day)).getUTCDay(),
    }
    if (!localDateMatches(schedule, localParts)) continue

    for (const time of schedule.times) {
      const candidate = localDateTimeToUtc(localDate, time, timezone)
      if (candidate && candidate > after) return candidate.toISOString()
    }
  }

  return new Date(after.getTime() + 24 * 60 * 60 * 1000).toISOString()
}

export const taskNextRunIsDue = (nextRunAt: unknown, nowInput: Date = new Date()) => {
  const raw = String(nextRunAt || '').trim()
  if (!raw) return true

  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) && timestamp <= nowInput.getTime()
}
