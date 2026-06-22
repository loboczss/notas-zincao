import { createAdminClient } from '../../services/integrim-notas/sync/repository'
import { authorizeStockIntegrinAdminOrServiceRole } from '../../utils/stock-integrin-auth'
import { buildCompraParametros } from './compra-parametros.get'
import type {
  IntegrimCompraParametros,
  IntegrimCompraParametrosUpdateRequest,
} from '../../../shared/types/IntegrimNotas'

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

export default defineEventHandler(async (event): Promise<{ success: boolean, parametros: IntegrimCompraParametros }> => {
  const { triggeredBy } = await authorizeStockIntegrinAdminOrServiceRole(event, {
    key: 'integrim-notas:compra-parametros',
    adminLimit: 30,
    serviceRoleLimit: 60,
    windowMs: 60 * 60 * 1000,
  })

  const body = await readBody<IntegrimCompraParametrosUpdateRequest>(event).catch(() => ({} as IntegrimCompraParametrosUpdateRequest))
  const values: Record<string, unknown> = {}
  if (body.lead_time_dias !== undefined) values.lead_time_dias = clampInt(body.lead_time_dias, 0, 365, 7)
  if (body.coverage_days !== undefined) values.coverage_days = clampInt(body.coverage_days, 1, 365, 45)

  const client = createAdminClient()
  const { data, error } = await (client as any)
    .from('integrim_compra_parametros')
    .upsert({
      id: true,
      ...values,
      updated_at: new Date().toISOString(),
      updated_by: triggeredBy,
    }, { onConflict: 'id' })
    .select('*')
    .single()

  if (error) {
    console.error('[integrim-notas:compra-parametros] update failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel salvar os parametros de compra.' })
  }

  return { success: true, parametros: buildCompraParametros(data as Record<string, unknown>) }
})
