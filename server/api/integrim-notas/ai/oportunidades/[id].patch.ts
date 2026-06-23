import { serverSupabaseUser } from '#supabase/server'
import type {
  IntegrimCompraOportunidadeActionRequest,
  IntegrimCompraOportunidadeActionResponse,
  IntegrimCompraOportunidadeStatus,
} from '../../../../../shared/types/IntegrimNotas'
import { updateCompraOpportunityStatus } from '../../../../services/integrim-notas/ai/opportunities'
import { assertRateLimit } from '../../../../utils/rate-limit'

const ACTIONABLE_STATUS = new Set<IntegrimCompraOportunidadeStatus>([
  'aceita',
  'ignorada',
  'comprada',
  'expirada',
])

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export default defineEventHandler(async (event): Promise<IntegrimCompraOportunidadeActionResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sessao invalida.' })

  assertRateLimit(event, {
    key: 'integrim-notas:oportunidades-ia:update-status',
    limit: 60,
    windowMs: 60 * 60 * 1000,
    userId: user.id,
  })

  const id = String(getRouterParam(event, 'id') || '').trim()
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Oportunidade IA invalida.' })

  const body = await readBody<IntegrimCompraOportunidadeActionRequest>(event).catch(() => null)
  const status = String(body?.status || '').trim() as IntegrimCompraOportunidadeStatus
  if (!ACTIONABLE_STATUS.has(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Status de oportunidade IA invalido.' })
  }

  return updateCompraOpportunityStatus(
    id,
    status as Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>,
  )
})
