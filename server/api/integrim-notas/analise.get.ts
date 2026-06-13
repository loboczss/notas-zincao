import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import type {
  IntegrimProdutoValor,
  IntegrimProdutoValorResponse,
  IntegrimProdutoValorSort,
  IntegrimProdutoValorStats,
} from '../../../shared/types/IntegrimNotas'

const SORT_COLUMNS: Record<IntegrimProdutoValorSort, { column: string, ascending: boolean }> = {
  score_valor: { column: 'score_valor', ascending: false },
  faturamento_365d: { column: 'faturamento_365d', ascending: false },
  margem_365d: { column: 'margem_365d', ascending: false },
  qtd_365d: { column: 'qtd_365d', ascending: false },
  giro_diario: { column: 'giro_diario', ascending: false },
  // Menor cobertura = mais urgente: ascendente.
  dias_cobertura: { column: 'dias_cobertura', ascending: true },
  sugestao_compra: { column: 'sugestao_compra', ascending: false },
}

const parsePositiveInteger = (value: unknown) => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) return null
  const integer = Math.trunc(parsed)
  return integer > 0 ? integer : null
}

const sanitizeLike = (value: string) =>
  value.replace(/[%,()._{}\\]/g, ' ').replace(/\s+/g, ' ').trim()

const parseSort = (value: unknown): IntegrimProdutoValorSort => {
  const key = String(value || '').trim() as IntegrimProdutoValorSort
  return key in SORT_COLUMNS ? key : 'score_valor'
}

const numberOrNull = (value: unknown) =>
  value === null || value === undefined ? null : Number(value)

const toProduto = (row: Record<string, unknown>): IntegrimProdutoValor => ({
  id: String(row.id),
  idempresa: Number(row.idempresa || 0),
  idproduto: Number(row.idproduto || 0),
  idsubproduto: Number(row.idsubproduto || 0),
  descricao: row.descricao ? String(row.descricao) : null,
  saldo_disponivel: Number(row.saldo_disponivel || 0),
  custo_unit: numberOrNull(row.custo_unit),
  qtd_30d: Number(row.qtd_30d || 0),
  qtd_90d: Number(row.qtd_90d || 0),
  qtd_180d: Number(row.qtd_180d || 0),
  qtd_365d: Number(row.qtd_365d || 0),
  faturamento_30d: Number(row.faturamento_30d || 0),
  faturamento_90d: Number(row.faturamento_90d || 0),
  faturamento_180d: Number(row.faturamento_180d || 0),
  faturamento_365d: Number(row.faturamento_365d || 0),
  margem_365d: Number(row.margem_365d || 0),
  num_notas_365d: Number(row.num_notas_365d || 0),
  ultima_venda: row.ultima_venda ? String(row.ultima_venda) : null,
  giro_diario: Number(row.giro_diario || 0),
  dias_cobertura: numberOrNull(row.dias_cobertura),
  sugestao_compra: Number(row.sugestao_compra || 0),
  score_valor: Number(row.score_valor || 0),
  updated_at: String(row.updated_at || ''),
})

const defaultStats = (): IntegrimProdutoValorStats => ({
  total_produtos: 0,
  faturamento_365d_total: 0,
  margem_365d_total: 0,
  produtos_em_risco: 0,
  ultima_sincronizacao: null,
})

const fetchStats = async (client: any, idempresa: number | null): Promise<IntegrimProdutoValorStats> => {
  const { data, error } = await client
    .rpc('integrim_produto_valor_stats', { p_idempresa: idempresa })
    .maybeSingle()

  if (error) {
    console.error('[api/integrim-notas/analise] stats error:', error.message)
    return defaultStats()
  }

  const row = (data || {}) as Record<string, unknown>
  return {
    total_produtos: Number(row.total_produtos || 0),
    faturamento_365d_total: Number(row.faturamento_365d_total || 0),
    margem_365d_total: Number(row.margem_365d_total || 0),
    produtos_em_risco: Number(row.produtos_em_risco || 0),
    ultima_sincronizacao: row.ultima_sincronizacao ? String(row.ultima_sincronizacao) : null,
  }
}

export default defineEventHandler(async (event): Promise<IntegrimProdutoValorResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page || 1) || 1)
  const pageSize = Math.min(Math.max(Number(query.page_size || query.limit || 50), 1), 200)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const idempresa = parsePositiveInteger(query.idempresa)
  const search = sanitizeLike(String(query.search || ''))
  const sort = parseSort(query.sort)
  const sortConfig = SORT_COLUMNS[sort]

  let request = (client as any)
    .from('integrim_produto_valor')
    .select('*', { count: 'exact' })

  if (idempresa) request = request.eq('idempresa', idempresa)
  if (search) request = request.ilike('descricao', `%${search}%`)

  request = request
    .order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: false })
    .order('idproduto', { ascending: true })
    .order('idsubproduto', { ascending: true })
    .range(from, to)

  const { data, error, count } = await request

  if (error) {
    console.error('[api/integrim-notas/analise] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel carregar a previsao de compras.' })
  }

  const stats = await fetchStats(client as any, idempresa)
  const totalItens = Number(count || 0)
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize))

  return {
    success: true,
    produtos: ((data || []) as Array<Record<string, unknown>>).map(toProduto),
    meta: {
      page,
      page_size: pageSize,
      total_itens: totalItens,
      total_paginas: totalPaginas,
    },
    stats,
  }
})
