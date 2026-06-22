import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import type {
  IntegrimRupturaResponse,
  IntegrimRupturaRow,
} from '../../../../shared/types/IntegrimNotas'

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

const parseDate = (value: unknown) => {
  const raw = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
}

const numberOrNull = (value: unknown) => (value === null || value === undefined ? null : Number(value))

export default defineEventHandler(async (event): Promise<IntegrimRupturaResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page || 1) || 1)
  const pageSize = Math.min(Math.max(Number(query.page_size || 50), 1), 200)
  const search = String(query.search || '').replace(/[%,()._{}\\]/g, ' ').trim()

  const { data, error } = await (client as any).rpc('integrim_produto_ruptura', {
    p_idempresa: parsePositiveInteger(query.idempresa),
    p_lead_time_dias: parseNonNegativeInteger(query.lead_time_dias),
    p_coverage_days: parsePositiveInteger(query.coverage_days),
    p_date_start: parseDate(query.date_start),
    p_date_end: parseDate(query.date_end),
    p_search: search || null,
    p_page: page,
    p_page_size: pageSize,
  })

  if (error) {
    console.error('[api/integrim-notas/insights/ruptura] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel calcular o alerta de ruptura.' })
  }

  const rows = (data || []) as Array<Record<string, unknown>>
  const first = rows[0] || null
  const totalItens = Number(first?.total_count || 0)

  const mapped: IntegrimRupturaRow[] = rows.map(row => ({
    idempresa: Number(row.idempresa || 0),
    idproduto: Number(row.idproduto || 0),
    idsubproduto: Number(row.idsubproduto || 0),
    descricao: row.descricao ? String(row.descricao) : null,
    saldo_disponivel: Number(row.saldo_disponivel || 0),
    custo_unit: numberOrNull(row.custo_unit),
    giro_diario: Number(row.giro_diario || 0),
    dias_cobertura: numberOrNull(row.dias_cobertura),
    data_ruptura: row.data_ruptura ? String(row.data_ruptura) : null,
    lead_time_dias: Number(row.lead_time_dias || 0),
    coverage_days: Number(row.coverage_days || 0),
    sugestao_compra: Number(row.sugestao_compra || 0),
    custo_sugestao: Number(row.custo_sugestao || 0),
  }))

  // Parametros atuais (lead time / cobertura) para a UI exibir e editar.
  const { data: paramRow } = await (client as any)
    .from('integrim_compra_parametros')
    .select('*')
    .eq('id', true)
    .maybeSingle()

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
      total_risco: Number(first?.stats_total_risco || 0),
      custo_total: Number(first?.stats_custo_total || 0),
    },
    parametros: {
      lead_time_dias: Number(paramRow?.lead_time_dias ?? 7),
      coverage_days: Number(paramRow?.coverage_days ?? 45),
      updated_at: paramRow?.updated_at ? String(paramRow.updated_at) : null,
      updated_by: paramRow?.updated_by ? String(paramRow.updated_by) : null,
    },
  }
})
