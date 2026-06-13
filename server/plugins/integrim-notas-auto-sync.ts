type IntegrimNotasAutoSyncState = {
  started: boolean
  timer: ReturnType<typeof setTimeout> | null
}

type TimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

// Roda 03:00 para nao colidir com o stock_integrin (02:00).
const DEFAULT_SYNC_TIME = '03:00'
const DEFAULT_SYNC_TIMEZONE = 'America/Sao_Paulo'
const GLOBAL_KEY = '__integrimNotasAutoSync'

const parseBooleanEnv = (value?: string) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return true
  return !['0', 'false', 'no', 'nao', 'off'].includes(normalized)
}

const parseSyncTime = (value?: string) => {
  const match = String(value || DEFAULT_SYNC_TIME).trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  return {
    hour: Number(match?.[1] ?? 3),
    minute: Number(match?.[2] ?? 0),
  }
}

const getTimeZoneParts = (date: Date, timeZone: string): TimeParts => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const values = Object.fromEntries(
    formatter.formatToParts(date).map(part => [part.type, part.value]),
  )

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

const zonedTimeToUtc = (parts: Omit<TimeParts, 'second'>, timeZone: string) => {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0)
  const actualParts = getTimeZoneParts(new Date(utcGuess), timeZone)
  const desiredAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0)
  const actualAsUtc = Date.UTC(
    actualParts.year,
    actualParts.month - 1,
    actualParts.day,
    actualParts.hour,
    actualParts.minute,
    actualParts.second,
  )
  return new Date(utcGuess + desiredAsUtc - actualAsUtc)
}

const getNextRunAt = (now: Date, timeZone: string, hour: number, minute: number) => {
  const nowParts = getTimeZoneParts(now, timeZone)
  let candidate = zonedTimeToUtc({ year: nowParts.year, month: nowParts.month, day: nowParts.day, hour, minute }, timeZone)

  if (candidate.getTime() <= now.getTime()) {
    candidate = zonedTimeToUtc({ year: nowParts.year, month: nowParts.month, day: nowParts.day + 1, hour, minute }, timeZone)
  }

  return candidate
}

const parseWindowMonths = (value?: string) => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) return undefined
  const integer = Math.trunc(parsed)
  return integer >= 1 ? integer : undefined
}

const runNightlySync = async () => {
  const [{ createAdminClient, getRunningSyncRun }, { runIntegrimNotasSync }] = await Promise.all([
    import('../services/integrim-notas/sync/repository'),
    import('../services/integrim-notas/sync'),
  ])
  const adminClient = createAdminClient()
  const runningRun = await getRunningSyncRun(adminClient)

  if (runningRun) {
    console.info('[integrim-notas:auto-sync] Sync already running, skipping nightly run.')
    return
  }

  await runIntegrimNotasSync({
    triggeredBy: 'auto-nightly-03h',
    deactivateStale: true,
    windowMonths: parseWindowMonths(process.env.INTEGRIM_NOTAS_WINDOW_MONTHS),
  })
}

export default defineNitroPlugin(() => {
  if (!parseBooleanEnv(process.env.INTEGRIM_NOTAS_AUTO_SYNC_ENABLED)) return

  const globalState = globalThis as typeof globalThis & Record<typeof GLOBAL_KEY, IntegrimNotasAutoSyncState | undefined>
  if (globalState[GLOBAL_KEY]?.started) return

  const state: IntegrimNotasAutoSyncState = { started: true, timer: null }
  globalState[GLOBAL_KEY] = state

  const timeZone = process.env.INTEGRIM_NOTAS_AUTO_SYNC_TIMEZONE?.trim() || DEFAULT_SYNC_TIMEZONE
  const { hour, minute } = parseSyncTime(process.env.INTEGRIM_NOTAS_AUTO_SYNC_TIME)

  const scheduleNextRun = () => {
    const nextRunAt = getNextRunAt(new Date(), timeZone, hour, minute)
    const delayMs = Math.max(1000, nextRunAt.getTime() - Date.now())

    console.info(`[integrim-notas:auto-sync] Next sync scheduled for ${nextRunAt.toISOString()} (${timeZone}).`)

    state.timer = setTimeout(async () => {
      try {
        await runNightlySync()
      }
      catch (error) {
        console.error('[integrim-notas:auto-sync] Nightly sync failed:', error)
      }
      finally {
        scheduleNextRun()
      }
    }, delayMs)
  }

  scheduleNextRun()
})
