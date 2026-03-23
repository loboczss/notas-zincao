import { serverSupabaseUser } from '#supabase/server'

export const profileGetHandler = defineEventHandler(async (event) => {
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

  return {
    id: authUid,
    email: user.email,
    metadata: user.user_metadata,
  }
})

export default profileGetHandler
