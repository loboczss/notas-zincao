import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import type {
  IntegrimCompraEventoTipo,
  IntegrimCompraOportunidadeStatus,
  IntegrimProdutoValor,
  IntegrimProdutoOportunidadeFilter,
  IntegrimProdutoValorResponse,
  IntegrimProdutoValorSort,
  IntegrimProdutoValorStats,
} from '../../../shared/types/IntegrimNotas'

const SORT_COLUMNS = new Set<IntegrimProdutoValorSort>([
  'score_valor',
  'faturamento_periodo',
  'margem_periodo',
  'qtd_periodo',
  'faturamento_365d',
  'margem_365d',
  'qtd_365d',
  'giro_diario',
  'dias_cobertura',
  'sugestao_compra',
  'oportunidade_ia',
])

const OPORTUNIDADE_FILTERS = new Set<IntegrimProdutoOportunidadeFilter>([
  'all',
  'calculo',
  'ia',
  'ambos',
])

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
  return SORT_COLUMNS.has(key) ? key : 'score_valor'
}

const parseOportunidadeFilter = (value: unknown): IntegrimProdutoOportunidadeFilter => {
  const key = String(value || '').trim() as IntegrimProdutoOportunidadeFilter
  return OPORTUNIDADE_FILTERS.has(key) ? key : 'all'
}

const parseDate = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const time = Date.parse(`${raw}T00:00:00Z`)
  return Number.isFinite(time) ? raw : null
}

const parseCoverageDays = (value: unknown) => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) return 45
  return Math.min(365, Math.max(1, Math.trunc(parsed)))
}

const parseBoolean = (value: unknown, fallback = true) => {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return fallback
  return !['0', 'false', 'nao', 'não', 'no', 'off'].includes(normalized)
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
  qtd_periodo: Number(row.qtd_periodo || 0),
  faturamento_periodo: Number(row.faturamento_periodo || 0),
  margem_periodo: Number(row.margem_periodo || 0),
  num_notas_periodo: Number(row.num_notas_periodo || 0),
  periodo_dias: Number(row.periodo_dias || 0),
  date_start: String(row.date_start || ''),
  date_end: String(row.date_end || ''),
  coverage_days: Number(row.coverage_days || 45),
  prev_qtd_periodo: Number(row.prev_qtd_periodo || 0),
  prev_faturamento_periodo: Number(row.prev_faturamento_periodo || 0),
  variacao_qtd_percent: numberOrNull(row.variacao_qtd_percent),
  variacao_faturamento_percent: numberOrNull(row.variacao_faturamento_percent),
  ai_oportunidade: row.ai_oportunidade_id
    ? {
        id: String(row.ai_oportunidade_id),
        evento_id: row.ai_evento_id ? String(row.ai_evento_id) : null,
        evento_tipo: row.ai_evento_tipo ? String(row.ai_evento_tipo) as IntegrimCompraEventoTipo : null,
        evento_titulo: row.ai_evento_titulo ? String(row.ai_evento_titulo) : null,
        status: String(row.ai_status || 'nova') as IntegrimCompraOportunidadeStatus,
        compra_extra: Number(row.ai_compra_extra || 0),
        confidence: Number(row.ai_confidence || 0),
        motivo: String(row.ai_motivo || ''),
        evidencias: Array.isArray(row.ai_evidencias) ? row.ai_evidencias : [],
        fontes: Array.isArray(row.ai_fontes) ? row.ai_fontes : [],
        contra_argumento: row.ai_contra_argumento ? String(row.ai_contra_argumento) : null,
        valid_until: row.ai_valid_until ? String(row.ai_valid_until) : null,
      }
    : null,
})

const defaultStats = (): IntegrimProdutoValorStats => ({
  total_produtos: 0,
  faturamento_365d_total: 0,
  margem_365d_total: 0,
  faturamento_periodo_total: 0,
  margem_periodo_total: 0,
  produtos_em_risco: 0,
  oportunidades_ia: 0,
  ultima_sincronizacao: null,
})

const statsFromRow = (row: Record<string, unknown> | null): IntegrimProdutoValorStats => {
  if (!row) return defaultStats()
  return {
    total_produtos: Number(row.stats_total_produtos || 0),
    faturamento_365d_total: Number(row.stats_faturamento_total || 0),
    margem_365d_total: Number(row.stats_margem_total || 0),
    faturamento_periodo_total: Number(row.stats_faturamento_total || 0),
    margem_periodo_total: Number(row.stats_margem_total || 0),
    produtos_em_risco: Number(row.stats_produtos_em_risco || 0),
    oportunidades_ia: Number(row.stats_oportunidades_ia || 0),
    ultima_sincronizacao: row.ultima_sincronizacao
      ? String(row.ultima_sincronizacao)
      : row.updated_at ? String(row.updated_at) : null,
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
  const idempresa = parsePositiveInteger(query.idempresa)
  const search = sanitizeLike(String(query.search || ''))
  const sort = parseSort(query.sort)
  const dateStart = parseDate(query.date_start)
  const dateEnd = parseDate(query.date_end)
  const coverageDays = parseCoverageDays(query.coverage_days)
  const comparePrevious = parseBoolean(query.compare_previous, true)
  const oportunidadeFilter = parseOportunidadeFilter(query.oportunidade_filter)

  const { data, error } = await (client as any)
    .rpc('integrim_produto_valor_periodo', {
      p_date_start: dateStart,
      p_date_end: dateEnd,
      p_coverage_days: coverageDays,
      p_idempresa: idempresa,
      p_search: search || null,
      p_sort: sort,
      p_page: page,
      p_page_size: pageSize,
      p_compare_previous: comparePrevious,
      p_oportunidade_filter: oportunidadeFilter,
    })

  if (error) {
    console.error('[api/integrim-notas/analise] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel carregar a previsao de compras.' })
  }

  const rows = (data || []) as Array<Record<string, unknown>>
  const stats = statsFromRow(rows[0] || null)
  const totalItens = Number(rows[0]?.total_count || 0)
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize))

  const { data: coverageData } = await (client as any).rpc('integrim_venda_dia_coverage', {
    p_idempresa: idempresa,
    p_date_start: dateStart,
    p_date_end: dateEnd,
  })
  const coverageRow = (Array.isArray(coverageData) ? coverageData[0] : coverageData) as Record<string, unknown> | null
  const coverage = {
    has_daily_rows: Boolean(coverageRow?.has_daily_rows),
    daily_min_date: coverageRow?.daily_min_date ? String(coverageRow.daily_min_date) : null,
    daily_max_date: coverageRow?.daily_max_date ? String(coverageRow.daily_max_date) : null,
    dias_com_dados: Number(coverageRow?.dias_com_dados || 0),
    periodo_dias: Number(coverageRow?.periodo_dias || 0),
    fallback_aplicavel: Boolean(coverageRow?.fallback_aplicavel),
    periodo_coberto: coverageRow ? Boolean(coverageRow.periodo_coberto) : true,
  }

  return {
    success: true,
    produtos: rows.map(toProduto),
    meta: {
      page,
      page_size: pageSize,
      total_itens: totalItens,
      total_paginas: totalPaginas,
    },
    stats,
    coverage,
  }
})
