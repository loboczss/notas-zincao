import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'

export const meGetHandler = defineEventHandler(async (event) => {
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

  const client = await serverSupabaseClient<Database>(event)

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, auth_uid, nome, email, role, foto_perfil, ultimo_login, updated_at')
    .eq('auth_uid', authUid)
    .maybeSingle()

  if (profileError) {
    console.error('[api/auth/me] profile query error:', profileError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }

  return {
    user: {
      id: authUid,
      email: user.email,
      metadata: user.user_metadata,
    },
    profile,
  }
})

export default meGetHandler
