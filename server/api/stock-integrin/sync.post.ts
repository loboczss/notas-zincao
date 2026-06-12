import {
  runStockIntegrinSync,
  startStockIntegrinSyncInBackground,
} from '../../services/stock-integrin/sync/index'
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

  const maxPages = parseMaxPages(body?.max_pages)
  const companyIds = parseCompanyIds(body?.company_ids)
  const deactivateStale = typeof body?.deactivate_stale === 'boolean' ? body.deactivate_stale : undefined

  // O dry-run termina rapido e devolve amostras na resposta, entao roda inline.
  if (body?.dry_run) {
    return await runStockIntegrinSync({
      dryRun: true,
      maxPages,
      companyIds,
      deactivateStale,
      triggeredBy,
    })
  }

  // A sincronizacao real pode levar minutos: roda em segundo plano no servidor e
  // responde de imediato com o run_id, evitando o timeout do gateway. O front
  // acompanha o progresso pelo endpoint /api/stock-integrin/sync-status.
  return await startStockIntegrinSyncInBackground({
    maxPages,
    companyIds,
    deactivateStale,
    triggeredBy,
  })
})
