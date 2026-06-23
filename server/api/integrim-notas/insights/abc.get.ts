import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import type {
  IntegrimAbcClasse,
  IntegrimAbcMetric,
  IntegrimAbcResponse,
  IntegrimAbcRow,
} from '../../../../shared/types/IntegrimNotas'
import { parseDate, parsePositiveInteger, sanitizeLike } from '../../../utils/integrim-query'

const parseMetric = (value: unknown): IntegrimAbcMetric => {
  const key = String(value || '').trim().toLowerCase()
  return key === 'margem' || key === 'quantidade' ? key : 'faturamento'
}

export default defineEventHandler(async (event): Promise<IntegrimAbcResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page || 1) || 1)
  const pageSize = Math.min(Math.max(Number(query.page_size || 50), 1), 200)
  const metric = parseMetric(query.metric)
  const search = sanitizeLike(query.search)

  const { data, error } = await (client as any).rpc('integrim_produto_abc', {
    p_idempresa: parsePositiveInteger(query.idempresa),
    p_date_start: parseDate(query.date_start),
    p_date_end: parseDate(query.date_end),
    p_metric: metric,
    p_search: search || null,
    p_page: page,
    p_page_size: pageSize,
  })

  if (error) {
    console.error('[api/integrim-notas/insights/abc] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel calcular a curva ABC.' })
  }

  const rows = (data || []) as Array<Record<string, unknown>>
  const first = rows[0] || null
  const totalItens = Number(first?.total_count || 0)

  const mapped: IntegrimAbcRow[] = rows.map(row => ({
    idempresa: Number(row.idempresa || 0),
    idproduto: Number(row.idproduto || 0),
    idsubproduto: Number(row.idsubproduto || 0),
    descricao: row.descricao ? String(row.descricao) : null,
    valor: Number(row.valor || 0),
    participacao: Number(row.participacao || 0),
    acumulado: Number(row.acumulado || 0),
    classe: String(row.classe || 'C') as IntegrimAbcClasse,
  }))

  return {
    success: true,
    rows: mapped,
    meta: {
      page,
      page_size: pageSize,
      total_itens: totalItens,
      total_paginas: Math.max(1, Math.ceil(totalItens / pageSize)),
    },
    resumo: {
      metric,
      classe_a: Number(first?.classe_a_count || 0),
      classe_b: Number(first?.classe_b_count || 0),
      classe_c: Number(first?.classe_c_count || 0),
      valor_total: Number(first?.valor_total || 0),
    },
  }
})
