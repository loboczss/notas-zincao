import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import type {
  IntegrimSazonalidadeAno,
  IntegrimSazonalidadeResponse,
  IntegrimSazonalidadeRow,
} from '../../../../shared/types/IntegrimNotas'
import { parsePositiveInteger } from '../../../utils/integrim-query'

export default defineEventHandler(async (event): Promise<IntegrimSazonalidadeResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)

  const idempresa = parsePositiveInteger(query.idempresa)
  const idproduto = parsePositiveInteger(query.idproduto)
  const idsubproduto = parsePositiveInteger(query.idsubproduto)
  const ano = parsePositiveInteger(query.ano)

  const [{ data, error }, { data: anosData, error: anosError }] = await Promise.all([
    (client as any).rpc('integrim_sazonalidade', {
      p_idempresa: idempresa,
      p_idproduto: idproduto,
      p_idsubproduto: idsubproduto,
      p_ano: ano,
    }),
    (client as any).rpc('integrim_sazonalidade_anos', {
      p_idempresa: idempresa,
      p_idproduto: idproduto,
      p_idsubproduto: idsubproduto,
    }),
  ])

  if (error || anosError) {
    console.error('[api/integrim-notas/insights/sazonalidade] error:', (error || anosError)?.message)
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

  const anos = ((anosData || []) as Array<Record<string, unknown>>).map((row): IntegrimSazonalidadeAno => ({
    ano: Number(row.ano || 0),
    qtd: Number(row.qtd || 0),
    faturamento: Number(row.faturamento || 0),
    num_notas: Number(row.num_notas || 0),
  }))

  return { success: true, rows, requer_backfill: anos.length === 0, ano, anos }
})
