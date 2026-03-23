import { serverSupabaseUser } from '#supabase/server'
import { AVAILABLE_OPENAI_MODELS, DEFAULT_OPENAI_MODEL } from '../../../shared/constants/OpenAIModels'

export const openaiModelsGetHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  return {
    defaultModel: DEFAULT_OPENAI_MODEL,
    models: AVAILABLE_OPENAI_MODELS,
  }
})

export default openaiModelsGetHandler
