import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export const notasRetiradaListGetHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const authUid = user.id || user.sub

  if (!authUid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authenticated user id not found.',
    })
  }

  const client = await serverSupabaseClient(event)

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .select('id, contato_id, nome_cliente, numero_nota, serie_nota, data_compra, data_retirada, valor_total, status_retirada, criado_em, produtos, foto_url, foto_cliente_url, comprovante_retirada_url')
    .eq('owner_user_id', authUid)
    .in('status_retirada', ['pendente', 'parcial'])
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('[api/notas/retirada-list] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível listar as notas para retirada.',
    })
  }

  return {
    success: true,
    notas: data || [],
  }
})

export default notasRetiradaListGetHandler
