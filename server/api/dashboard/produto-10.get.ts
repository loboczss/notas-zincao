import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const toInteger = (value: unknown) => Math.trunc(toNumber(value))

type DashboardMetricsRow = {
  produto_10_id?: number | string | null
  produto_10_nome?: string | null
  produto_10_saldo_estoque?: number | string | null
  produto_10_notas_pendentes_com_produto?: number | string | null
  produto_10_quantidade_pendente_notas?: number | string | null
  produto_10_percentual_comprometido?: number | string | null
  produto_10_quantidade_filhos?: number | string | null
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await (client as any)
    .from('dashboard_metrics')
    .select(`
      produto_10_id,
      produto_10_nome,
      produto_10_saldo_estoque,
      produto_10_notas_pendentes_com_produto,
      produto_10_quantidade_pendente_notas,
      produto_10_percentual_comprometido,
      produto_10_quantidade_filhos
    `)
    .eq('id', 'global')
    .maybeSingle()

  if (error) {
    console.error('[api/dashboard/produto-10] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel carregar os dados do produto prioritario.' })
  }

  if (!data) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Metricas do dashboard ainda nao foram inicializadas.',
    })
  }

  const metrics = data as DashboardMetricsRow

  return {
    success: true,
    produto: {
      id: toInteger(metrics.produto_10_id) || 10,
      nome: String(metrics.produto_10_nome || 'Produto ID 10'),
      saldo_estoque: toNumber(metrics.produto_10_saldo_estoque),
      notas_pendentes_com_produto: toInteger(metrics.produto_10_notas_pendentes_com_produto),
      quantidade_pendente_notas: toNumber(metrics.produto_10_quantidade_pendente_notas),
      percentual_comprometido: toInteger(metrics.produto_10_percentual_comprometido),
      quantidade_filhos: toInteger(metrics.produto_10_quantidade_filhos),
    },
  }
})
