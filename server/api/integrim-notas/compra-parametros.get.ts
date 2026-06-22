import { serverSupabaseUser } from '#supabase/server'
import { createAdminClient } from '../../services/integrim-notas/sync/repository'
import type { IntegrimCompraParametros } from '../../../shared/types/IntegrimNotas'

export const buildCompraParametros = (row: Record<string, unknown> | null): IntegrimCompraParametros => ({
  lead_time_dias: Number(row?.lead_time_dias ?? 7),
  coverage_days: Number(row?.coverage_days ?? 45),
  updated_at: row?.updated_at ? String(row.updated_at) : null,
  updated_by: row?.updated_by ? String(row.updated_by) : null,
})

export default defineEventHandler(async (event): Promise<{ success: boolean, parametros: IntegrimCompraParametros }> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = createAdminClient()
  const { data } = await (client as any)
    .from('integrim_compra_parametros')
    .select('*')
    .eq('id', true)
    .maybeSingle()

  return { success: true, parametros: buildCompraParametros((data as Record<string, unknown>) || null) }
})
