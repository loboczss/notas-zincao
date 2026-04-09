import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.').trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

type NotaResumoItem = {
  status_retirada?: 'pendente' | 'parcial' | 'retirada' | 'cancelada' | null
  produtos?: Array<{
    quantidade?: number | string | null
    quantidade_retirada?: number | string | null
  }> | null
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .select('status_retirada, produtos')

  if (error) {
    console.error('[api/dashboard/notas-resumo] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel carregar o resumo das notas.',
    })
  }

  const notas = (data || []) as NotaResumoItem[]

  let pendentes = 0
  let parciais = 0
  let retiradas = 0
  let canceladas = 0

  let pecasCompradas = 0
  let pecasEntregues = 0

  for (const nota of notas) {
    const status = String(nota?.status_retirada || '').toLowerCase()
    if (status === 'pendente') pendentes += 1
    if (status === 'parcial') parciais += 1
    if (status === 'retirada') retiradas += 1
    if (status === 'cancelada') canceladas += 1

    const produtos = Array.isArray(nota?.produtos) ? nota.produtos : []
    for (const produto of produtos) {
      pecasCompradas += toNumber(produto?.quantidade)
      pecasEntregues += toNumber(produto?.quantidade_retirada)
    }
  }

  const pecasCompradasRounded = Math.round(pecasCompradas * 100) / 100
  const pecasEntreguesRounded = Math.round(pecasEntregues * 100) / 100
  const pecasPendentes = Math.max(0, Math.round((pecasCompradas - pecasEntregues) * 100) / 100)
  const percentualEntrega = pecasCompradas > 0
    ? Math.round((pecasEntregues / pecasCompradas) * 100)
    : 0

  return {
    success: true,
    resumo: {
      total_notas: notas.length,
      pendentes,
      parciais,
      retiradas,
      canceladas,
      pecas_compradas: pecasCompradasRounded,
      pecas_entregues: pecasEntreguesRounded,
      pecas_pendentes: pecasPendentes,
      percentual_entrega: percentualEntrega,
    },
  }
})
