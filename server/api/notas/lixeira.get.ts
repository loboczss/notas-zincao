import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~~/app/types/database.types'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  // Busca notas onde deleted_at NÃO é nulo com o nome de quem excluiu
  const { data: notas, error: nError } = await client
    .from('notas_retirada')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (nError) {
    console.error('[api/notas/lixeira] error:', nError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro ao carregar lixeira.',
    })
  }

  // 2. Buscar nomes dos perfis
  const userIds = [...new Set(notas?.map((n: any) => n.deleted_by).filter(Boolean))]
  
  let profiles: any[] = []
  if (userIds.length > 0) {
    const { data: pData } = await client
      .from('profiles')
      .select('auth_uid, nome')
      .in('auth_uid', userIds)
    profiles = pData || []
  }

  // 3. Mesclar dados
  const notasComPerfis = notas?.map((n: any) => ({
    ...n,
    deleted_by_profile: profiles.find(p => p.auth_uid === n.deleted_by) || null
  }))

  return { success: true, notas: notasComPerfis || [] }
})
