import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.').trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const toInteger = (value: unknown) => Math.trunc(toNumber(value))

type DashboardMetricsRow = {
  total_notas?: number | string | null
  pendentes?: number | string | null
  parciais?: number | string | null
  retiradas?: number | string | null
  canceladas?: number | string | null
  pecas_compradas?: number | string | null
  pecas_entregues?: number | string | null
  pecas_pendentes?: number | string | null
  percentual_entrega?: number | string | null
  updated_at?: string | null
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
      total_notas,
      pendentes,
      parciais,
      retiradas,
      canceladas,
      pecas_compradas,
      pecas_entregues,
      pecas_pendentes,
      percentual_entrega,
      updated_at
    `)
    .eq('id', 'global')
    .maybeSingle()

  if (error) {
    console.error('[api/dashboard/notas-resumo] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel carregar o resumo das notas.',
    })
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
    resumo: {
      total_notas: toInteger(metrics.total_notas),
      pendentes: toInteger(metrics.pendentes),
      parciais: toInteger(metrics.parciais),
      retiradas: toInteger(metrics.retiradas),
      canceladas: toInteger(metrics.canceladas),
      pecas_compradas: toNumber(metrics.pecas_compradas),
      pecas_entregues: toNumber(metrics.pecas_entregues),
      pecas_pendentes: toNumber(metrics.pecas_pendentes),
      percentual_entrega: toInteger(metrics.percentual_entrega),
      updated_at: metrics.updated_at || null,
    },
  }
})
