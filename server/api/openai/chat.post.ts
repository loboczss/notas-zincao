import { serverSupabaseUser } from '#supabase/server'
import type { OpenAIChatRequest } from '../../../shared/types/OpenAI'
import { isOpenAIModelSupported } from '../../../shared/constants/OpenAIModels'
import { createOpenAIChat } from '../../services/openai'
import { assertRateLimit } from '../../utils/rate-limit'

export const openaiChatPostHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  assertRateLimit(event, {
    key: 'openai:chat',
    limit: 20,
    windowMs: 60_000,
    userId: user.id || user.sub,
  })

  const body = await readBody<OpenAIChatRequest>(event)

  const trimmedMessage = body?.message?.trim() || ''
  const hasImage = Boolean(body?.imageDataUrl)

  if (!trimmedMessage && !hasImage) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message or image is required.',
    })
  }

  if (trimmedMessage && trimmedMessage.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is too short.',
    })
  }

  if (trimmedMessage.length > 5000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is too long.',
    })
  }

  if (body.imageDataUrl) {
    if (!body.imageDataUrl.startsWith('data:image/')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Image format is invalid.',
      })
    }

    if (body.imageDataUrl.length > 8_000_000) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Image is too large.',
      })
    }
  }

  if (body.model && !isOpenAIModelSupported(body.model)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Model is not supported.',
    })
  }

  try {
    return await createOpenAIChat(event, {
      message: trimmedMessage,
      model: body.model,
      imageDataUrl: body.imageDataUrl,
    })
  }
  catch (error) {
    console.error('[api/openai/chat] error:', error instanceof Error ? error.message : 'unknown error')
    throw createError({
      statusCode: 502,
      statusMessage: 'OpenAI request failed.',
    })
  }
})

export default openaiChatPostHandler
