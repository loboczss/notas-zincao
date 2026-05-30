import {
  createAdminClient,
  requestSyncCancel,
} from '../../services/stock-integrin/sync/repository'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../utils/stock-integrin-auth'
import type {
  StockIntegrinCancelSyncRequest,
  StockIntegrinCancelSyncResponse,
} from '../../../shared/types/StockIntegrin'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const parseRunId = (value: unknown) => {
  const runId = String(value || '').trim()
  if (!runId) return null

  if (!uuidPattern.test(runId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da sincronizacao invalido.',
    })
  }

  return runId
}

export default defineEventHandler(async (event): Promise<StockIntegrinCancelSyncResponse> => {
  const body = ((await readBody<StockIntegrinCancelSyncRequest>(event).catch(() => ({}))) || {}) as StockIntegrinCancelSyncRequest

  await authorizeStockIntegrinAdminOrServiceRole(event, {
    key: 'stock-integrin:cancel',
    adminLimit: 12,
    serviceRoleLimit: 20,
  })

  const adminClient = createAdminClient()
  const result = await requestSyncCancel(adminClient, parseRunId(body?.run_id))

  if (!result.cancelRequested) {
    return {
      success: true,
      cancel_requested: false,
      cancelled: false,
      run_id: result.runId,
      message: 'Nenhuma sincronizacao em andamento para parar.',
    }
  }

  return {
    success: true,
    cancel_requested: true,
    cancelled: Boolean(result.cancelled),
    run_id: result.runId,
    message: 'Sincronizacao interrompida. A tela ja pode ser atualizada.',
  }
})
