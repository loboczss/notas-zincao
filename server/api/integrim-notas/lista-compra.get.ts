import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import type {
  IntegrimListaCompraResponse,
  IntegrimListaCompraRow,
  IntegrimListaCompraSort,
} from '../../../shared/types/IntegrimNotas'

const SORTS = new Set<IntegrimListaCompraSort>(['risco', 'ruptura', 'sugestao', 'faturamento'])

const parsePositiveInteger = (value: unknown) => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) return null
  const integer = Math.trunc(parsed)
  return integer > 0 ? integer : null
}

const parseNonNegativeInteger = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  const integer = Math.trunc(parsed)
  return integer >= 0 ? integer : null
}

const parseFloatOrNull = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  return !['0', 'false', 'nao', 'não', 'no', 'off'].includes(normalized)
}

const numberOrNull = (value: unknown) => (value === null || value === undefined ? null : Number(value))

export default defineEventHandler(async (event): Promise<IntegrimListaCompraResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page || 1) || 1)
  const pageSize = Math.min(Math.max(Number(query.page_size || 50), 1), 200)
  const search = String(query.search || '').replace(/[%,()._{}\\]/g, ' ').trim()
  const sortKey = String(query.sort || '').trim() as IntegrimListaCompraSort
  const sort = SORTS.has(sortKey) ? sortKey : 'risco'

  // Parametros salvos (lead time / cobertura) sao o padrao quando o front nao envia.
  const { data: paramRow } = await (client as any)
    .from('integrim_compra_parametros')
    .select('*')
    .eq('id', true)
    .maybeSingle()

  const leadTimeDefault = Number(paramRow?.lead_time_dias ?? 7)
  const coverageDefault = Number(paramRow?.coverage_days ?? 30)

  const leadTime = parseNonNegativeInteger(query.lead_time_dias) ?? leadTimeDefault
  const coverage = parsePositiveInteger(query.coverage_days) ?? coverageDefault
  const serviceLevel = parseFloatOrNull(query.service_level) ?? 0.95
  const horizon = parsePositiveInteger(query.horizon_days) ?? 90
  const onlyBuy = parseBoolean(query.only_buy, true)

  const { data, error } = await (client as any).rpc('integrim_lista_compra', {
    p_idempresa: parsePositiveInteger(query.idempresa),
    p_lead_time_dias: leadTime,
    p_coverage_days: coverage,
    p_service_level: serviceLevel,
    p_horizon_days: horizon,
    p_only_buy: onlyBuy,
    p_search: search || null,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  })

  if (error) {
    console.error('[api/integrim-notas/lista-compra] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel montar a lista de compra.' })
  }

  const rows = (data || []) as Array<Record<string, unknown>>
  const first = rows[0] || null
  const totalItens = Number(first?.total_count || 0)

  const mapped: IntegrimListaCompraRow[] = rows.map(row => ({
    idempresa: Number(row.idempresa || 0),
    idproduto: Number(row.idproduto || 0),
    idsubproduto: Number(row.idsubproduto || 0),
    descricao: String(row.descricao || ''),
    estoque_ausente: Boolean(row.estoque_ausente),
    saldo_disponivel: Number(row.saldo_disponivel || 0),
    custo_unit: numberOrNull(row.custo_unit),
    demanda_diaria: Number(row.demanda_diaria || 0),
    desvio_diario: Number(row.desvio_diario || 0),
    cv: numberOrNull(row.cv),
    lead_time_dias: Number(row.lead_time_dias || 0),
    coverage_days: Number(row.coverage_days || 0),
    estoque_seguranca: Number(row.estoque_seguranca || 0),
    ponto_reposicao: Number(row.ponto_reposicao || 0),
    dias_ate_ruptura: numberOrNull(row.dias_ate_ruptura),
    precisa_comprar: Boolean(row.precisa_comprar),
    sugestao_compra: Number(row.sugestao_compra || 0),
    capital_necessario: Number(row.capital_necessario || 0),
    margem_unit: numberOrNull(row.margem_unit),
    dinheiro_em_risco: Number(row.dinheiro_em_risco || 0),
    faturamento_periodo: Number(row.faturamento_periodo || 0),
    qtd_periodo: Number(row.qtd_periodo || 0),
    dias_com_venda: Number(row.dias_com_venda || 0),
    ultima_venda: row.ultima_venda ? String(row.ultima_venda) : null,
    tendencia_percent: numberOrNull(row.tendencia_percent),
    classe_abc: (String(row.classe_abc || 'C') as IntegrimListaCompraRow['classe_abc']),
    classe_xyz: (String(row.classe_xyz || 'Z') as IntegrimListaCompraRow['classe_xyz']),
    confianca: (String(row.confianca || 'baixa') as IntegrimListaCompraRow['confianca']),
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
    stats: {
      total_itens: totalItens,
      itens_comprar: Number(first?.stats_itens_comprar || 0),
      capital_total: Number(first?.stats_capital_total || 0),
      risco_total: Number(first?.stats_risco_total || 0),
    },
    parametros: {
      lead_time_dias: leadTimeDefault,
      coverage_days: coverageDefault,
      updated_at: paramRow?.updated_at ? String(paramRow.updated_at) : null,
      updated_by: paramRow?.updated_by ? String(paramRow.updated_by) : null,
    },
  }
})
