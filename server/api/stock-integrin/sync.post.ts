import { runStockIntegrinSync } from '../../services/stock-integrin/sync/index'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../utils/stock-integrin-auth'
import type {
  StockIntegrinSyncRequest,
  StockIntegrinSyncResponse,
} from '../../../shared/types/StockIntegrin'

const parseMaxPages = (value: unknown) => {
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

export default defineEventHandler(async (event): Promise<StockIntegrinSyncResponse> => {
  const body = ((await readBody<StockIntegrinSyncRequest>(event).catch(() => ({}))) || {}) as StockIntegrinSyncRequest
  const { triggeredBy } = await authorizeStockIntegrinAdminOrServiceRole(event, {
    key: 'stock-integrin:sync',
    adminLimit: 4,
    serviceRoleLimit: 6,
  })

  return await runStockIntegrinSync({
    dryRun: Boolean(body?.dry_run),
    maxPages: parseMaxPages(body?.max_pages),
    companyIds: parseCompanyIds(body?.company_ids),
    deactivateStale: typeof body?.deactivate_stale === 'boolean' ? body.deactivate_stale : undefined,
    triggeredBy,
  })
})
