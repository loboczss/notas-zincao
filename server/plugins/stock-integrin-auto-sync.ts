type StockIntegrinAutoSyncState = {
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

const DEFAULT_SYNC_TIME = '02:00'
const DEFAULT_SYNC_TIMEZONE = 'America/Sao_Paulo'
const GLOBAL_KEY = '__stockIntegrinAutoSync'

const parseBooleanEnv = (value?: string) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return true
  return !['0', 'false', 'no', 'nao', 'off'].includes(normalized)
}

const parseSyncTime = (value?: string) => {
  const match = String(value || DEFAULT_SYNC_TIME).trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)

  return {
    hour: Number(match?.[1] ?? 2),
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
  let candidate = zonedTimeToUtc({
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
    hour,
    minute,
  }, timeZone)

  if (candidate.getTime() <= now.getTime()) {
    candidate = zonedTimeToUtc({
      year: nowParts.year,
      month: nowParts.month,
      day: nowParts.day + 1,
      hour,
      minute,
    }, timeZone)
  }

  return candidate
}

const runNightlySync = async () => {
  const [{ createAdminClient, getRunningSyncRun }, { runStockIntegrinSync }] = await Promise.all([
    import('../services/stock-integrin/sync/repository'),
    import('../services/stock-integrin/sync'),
  ])
  const adminClient = createAdminClient()
  const runningRun = await getRunningSyncRun(adminClient)

  if (runningRun) {
    console.info('[stock-integrin:auto-sync] Sync already running, skipping nightly run.')
    return
  }

  await runStockIntegrinSync({
    triggeredBy: 'auto-nightly-02h',
    deactivateStale: true,
  })
}

export default defineNitroPlugin(() => {
  if (!parseBooleanEnv(process.env.STOCK_INTEGRIN_AUTO_SYNC_ENABLED)) return

  const globalState = globalThis as typeof globalThis & Record<typeof GLOBAL_KEY, StockIntegrinAutoSyncState | undefined>
  if (globalState[GLOBAL_KEY]?.started) return

  const state: StockIntegrinAutoSyncState = {
    started: true,
    timer: null,
  }
  globalState[GLOBAL_KEY] = state

  const timeZone = process.env.STOCK_INTEGRIN_AUTO_SYNC_TIMEZONE?.trim() || DEFAULT_SYNC_TIMEZONE
  const { hour, minute } = parseSyncTime(process.env.STOCK_INTEGRIN_AUTO_SYNC_TIME)

  const scheduleNextRun = () => {
    const nextRunAt = getNextRunAt(new Date(), timeZone, hour, minute)
    const delayMs = Math.max(1000, nextRunAt.getTime() - Date.now())

    console.info(`[stock-integrin:auto-sync] Next sync scheduled for ${nextRunAt.toISOString()} (${timeZone}).`)

    state.timer = setTimeout(async () => {
      try {
        await runNightlySync()
      }
      catch (error) {
        console.error('[stock-integrin:auto-sync] Nightly sync failed:', error)
      }
      finally {
        scheduleNextRun()
      }
    }, delayMs)
  }

  scheduleNextRun()
})
