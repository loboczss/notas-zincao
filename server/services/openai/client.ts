import OpenAI from 'openai'

export function getOpenAIClient(event: Parameters<typeof useRuntimeConfig>[0]) {
  const config = useRuntimeConfig(event)

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key is not configured on server.',
    })
  }

  return new OpenAI({
    apiKey: config.openaiApiKey,
  })
}
