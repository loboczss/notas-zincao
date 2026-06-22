import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import type {
  IntegrimSazonalidadeResponse,
  IntegrimSazonalidadeRow,
} from '../../../../shared/types/IntegrimNotas'

const parsePositiveInteger = (value: unknown) => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) return null
  const integer = Math.trunc(parsed)
  return integer > 0 ? integer : null
}

export default defineEventHandler(async (event): Promise<IntegrimSazonalidadeResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)

  const { data, error } = await (client as any).rpc('integrim_sazonalidade', {
    p_idempresa: parsePositiveInteger(query.idempresa),
    p_idproduto: parsePositiveInteger(query.idproduto),
    p_idsubproduto: parsePositiveInteger(query.idsubproduto),
  })

  if (error) {
    console.error('[api/integrim-notas/insights/sazonalidade] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel calcular a sazonalidade.' })
  }

  const rows = ((data || []) as Array<Record<string, unknown>>).map((row): IntegrimSazonalidadeRow => ({
    mes: Number(row.mes || 0),
    qtd: Number(row.qtd || 0),
    faturamento: Number(row.faturamento || 0),
    num_notas: Number(row.num_notas || 0),
    qtd_share: Number(row.qtd_share || 0),
    faturamento_share: Number(row.faturamento_share || 0),
  }))

  return { success: true, rows, requer_backfill: rows.length === 0 }
})
