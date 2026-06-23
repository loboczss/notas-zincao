import {
  runIntegrimNotasSync,
  startIntegrimNotasSyncInBackground,
} from '../../../services/integrim-notas/sync/index'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../../utils/stock-integrin-auth'
import type {
  IntegrimNotasSyncRequest,
  IntegrimNotasSyncResponse,
} from '../../../../shared/types/IntegrimNotas'

const parseWindowMonths = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  const integer = Math.trunc(parsed)
  return integer >= 1 ? integer : undefined
}

const parseDate = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined
  return Number.isFinite(Date.parse(`${raw}T00:00:00Z`)) ? raw : undefined
}

const parseCompanyIds = (value: unknown) => {
  if (!Array.isArray(value)) return undefined
  const ids = value
    .map(item => Number(item))
    .filter(item => Number.isFinite(item) && item > 0)
    .map(item => Math.trunc(item))
  return ids.length ? [...new Set(ids)] : undefined
}

export default defineEventHandler(async (event): Promise<IntegrimNotasSyncResponse> => {
  const body = ((await readBody<IntegrimNotasSyncRequest>(event).catch(() => ({}))) || {}) as IntegrimNotasSyncRequest
  const { triggeredBy } = await authorizeStockIntegrinAdminOrServiceRole(event, {
    key: 'integrim-notas:sync',
    adminLimit: 4,
    serviceRoleLimit: 6,
  })

  const companyIds = parseCompanyIds(body?.company_ids)
  const windowMonths = parseWindowMonths(body?.window_months)
  const startDate = parseDate(body?.date_start)
  const endDate = parseDate(body?.date_end)
  // So aceita intervalo quando as duas datas vierem coerentes (inicio <= fim).
  const hasRange = Boolean(startDate && endDate && startDate <= endDate)
  const deactivateStale = typeof body?.deactivate_stale === 'boolean' ? body.deactivate_stale : undefined
  // Opt-in: por padrao o sync nao baixa cabecalhos (a previsao nao os usa).
  const syncHeaders = body?.sync_headers === true

  // dry-run termina rapido e nao persiste; roda inline.
  if (body?.dry_run) {
    return await runIntegrimNotasSync({
      dryRun: true,
      companyIds,
      windowMonths,
      startDate: hasRange ? startDate : undefined,
      endDate: hasRange ? endDate : undefined,
      deactivateStale,
      syncHeaders,
      triggeredBy,
    })
  }

  // Sync real pode levar minutos: roda em segundo plano e responde de imediato.
  return await startIntegrimNotasSyncInBackground({
    companyIds,
    windowMonths,
    startDate: hasRange ? startDate : undefined,
    endDate: hasRange ? endDate : undefined,
    deactivateStale,
    syncHeaders,
    triggeredBy,
  })
})
