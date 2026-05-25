import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertActiveProfileRole, getAuthUidOrThrow } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const authUid = getAuthUidOrThrow(user)
  const notaId = getRouterParam(event, 'id')
  if (!notaId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da nota é obrigatório',
    })
  }

  const client = await serverSupabaseClient<Database>(event) as SupabaseClient<Database>

  const { data: notaAtual, error: notaError } = await (client as any)
    .from('notas_retirada')
    .select('id, owner_user_id')
    .eq('id', notaId)
    .single()

  if (notaError || !notaAtual) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nota nao encontrada.',
    })
  }

  if (notaAtual.owner_user_id !== authUid) {
    await assertActiveProfileRole(
      client as any,
      authUid,
      ['admin', 'colaborador'],
      'Sem permissao para ver historico desta nota.',
    )
  }

  // 1. Buscar o histórico
  const { data: historico, error: hError } = await (client as any)
    .from('notas_historico_edicao')
    .select('*')
    .eq('nota_id', notaId)
    .order('created_at', { ascending: false })

  if (hError) {
    console.error('[api/notas/historico] error:', hError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro ao carregar histórico.',
    })
  }

  // 2. Buscar os nomes dos perfis para os usuários do histórico
  const userIds = Array.from(
    new Set<string>(
      (historico || [])
        .map((h: any) => h.user_id)
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
    ),
  )
  
  let profiles: any[] = []
  if (userIds.length > 0) {
    const { data: pData } = await client
      .from('profiles')
      .select('auth_uid, nome')
      .in('auth_uid', userIds)
    profiles = pData || []
  }

  // 3. Mesclar os dados
  const historicoComPerfis = historico?.map((h: any) => ({
    ...h,
    profiles: profiles.find(p => p.auth_uid === h.user_id) || null
  }))

  return { success: true, historico: historicoComPerfis || [] }
})
