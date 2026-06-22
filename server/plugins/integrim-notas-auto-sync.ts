import type { IntegrimSyncSchedule } from '../../shared/types/IntegrimNotas'

type IntegrimNotasAutoSyncState = {
  started: boolean
  timer: ReturnType<typeof setTimeout> | null
  lastFiredKey: string | null
}

const GLOBAL_KEY = '__integrimNotasAutoSync'

// Quando o agendamento esta desligado ou sem proximo horario, reavalia a cada 5 min.
const RECHECK_MS = 5 * 60 * 1000
// Teto de espera entre ciclos: garante que mudancas de horario/janela feitas na UI
// sejam percebidas em ate 10 min, mesmo que o proximo disparo seja so amanha.
const MAX_SLEEP_MS = 10 * 60 * 1000

const parseBooleanEnv = (value?: string) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return true
  return !['0', 'false', 'no', 'nao', 'off'].includes(normalized)
}

const runNightlySync = async (schedule: IntegrimSyncSchedule) => {
  const [{ createAdminClient, getRunningSyncRun }, { runIntegrimNotasSync }] = await Promise.all([
    import('../services/integrim-notas/sync/repository'),
    import('../services/integrim-notas/sync'),
  ])
  const adminClient = createAdminClient()
  const runningRun = await getRunningSyncRun(adminClient)

  if (runningRun) {
    console.info('[integrim-notas:auto-sync] Sync already running, skipping scheduled run.')
    return
  }

  await runIntegrimNotasSync({
    triggeredBy: 'auto-agendado',
    deactivateStale: schedule.deactivate_stale,
    windowMonths: schedule.window_months,
  })
}

export default defineNitroPlugin(() => {
  // Kill switch global por ENV continua valendo (default: ligado).
  if (!parseBooleanEnv(process.env.INTEGRIM_NOTAS_AUTO_SYNC_ENABLED)) return

  const globalState = globalThis as typeof globalThis & Record<typeof GLOBAL_KEY, IntegrimNotasAutoSyncState | undefined>
  if (globalState[GLOBAL_KEY]?.started) return

  const state: IntegrimNotasAutoSyncState = { started: true, timer: null, lastFiredKey: null }
  globalState[GLOBAL_KEY] = state

  const tick = async () => {
    let schedule: IntegrimSyncSchedule | null = null

    try {
      const { createAdminClient } = await import('../services/integrim-notas/sync/repository')
      const { loadSyncSchedule } = await import('../services/integrim-notas/sync-schedule')
      schedule = await loadSyncSchedule(createAdminClient())
    }
    catch (error) {
      console.error('[integrim-notas:auto-sync] Failed to load schedule:', error)
    }

    if (!schedule || !schedule.enabled || !schedule.next_run_at) {
      state.timer = setTimeout(tick, RECHECK_MS)
      return
    }

    const next = new Date(schedule.next_run_at)
    const delay = next.getTime() - Date.now()

    if (delay <= 1000) {
      const key = next.toISOString()
      if (state.lastFiredKey !== key) {
        state.lastFiredKey = key
        console.info(`[integrim-notas:auto-sync] Firing scheduled sync (${key}).`)
        try {
          await runNightlySync(schedule)
        }
        catch (error) {
          console.error('[integrim-notas:auto-sync] Scheduled sync failed:', error)
        }
      }
      state.timer = setTimeout(tick, 2000)
      return
    }

    console.info(`[integrim-notas:auto-sync] Next sync at ${next.toISOString()} (${schedule.timezone}).`)
    state.timer = setTimeout(tick, Math.min(delay, MAX_SLEEP_MS))
  }

  tick()
})
