import { serverSupabaseUser } from '#supabase/server'

export const openaiHealthGetHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const config = useRuntimeConfig(event)

  return {
    configured: Boolean(config.openaiApiKey),
    provider: 'openai',
  }
})

export default openaiHealthGetHandler
