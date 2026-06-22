import {
  runIntegrimVendaDiaBackfill,
  startIntegrimVendaDiaBackfillInBackground,
} from '../../services/integrim-notas/sync/index'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../utils/stock-integrin-auth'
import type {
  IntegrimNotasSyncRequest,
  IntegrimNotasSyncResponse,
} from '../../../shared/types/IntegrimNotas'

const parseWindowMonths = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  const integer = Math.trunc(parsed)
  return integer >= 1 ? integer : undefined
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
    key: 'integrim-notas:rebuild-venda-dia',
    adminLimit: 4,
    serviceRoleLimit: 6,
  })

  const companyIds = parseCompanyIds(body?.company_ids)
  const windowMonths = parseWindowMonths(body?.window_months)

  if (body?.dry_run) {
    return await runIntegrimVendaDiaBackfill({
      dryRun: true,
      companyIds,
      windowMonths,
      triggeredBy,
    })
  }

  return await startIntegrimVendaDiaBackfillInBackground({
    companyIds,
    windowMonths,
    triggeredBy,
  })
})
