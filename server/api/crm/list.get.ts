import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export const crmListGetHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const client = await serverSupabaseClient(event)
  const query = getQuery(event)
  const search = String(query.search || '').trim()

  let request = (client as any)
    .from('crm_zincao')
    .select('id, created_at, contato_id, nome, cidade, email, data_nascimento, sentimento, urgencia, resumo_perfil, interesses, objeccoes, nome_social, fase_obra, compras_cliente')
    .order('created_at', { ascending: false })
    .limit(50)

  if (search) {
    request = request.or(`contato_id.ilike.%${search}%,nome.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data, error } = await request

  if (error) {
    console.error('[api/crm/list] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível listar contatos do CRM.',
    })
  }

  return {
    success: true,
    contatos: data || [],
  }
})

export default crmListGetHandler
