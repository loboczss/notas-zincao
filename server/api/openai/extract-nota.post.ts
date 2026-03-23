import { serverSupabaseUser } from '#supabase/server'
import type { OpenAINotaExtractionRequest } from '../../../shared/types/OpenAI'
import { extractNotaFromImage } from '../../services/openai'

export const openaiExtractNotaPostHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody<OpenAINotaExtractionRequest>(event)

  if (!body?.imageDataUrl || !body.imageDataUrl.startsWith('data:image/')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Image is required.',
    })
  }

  if (body.imageDataUrl.length > 8_000_000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Image is too large.',
    })
  }

  try {
    return await extractNotaFromImage(event, body.imageDataUrl)
  }
  catch (error) {
    console.error('[api/openai/extract-nota] error:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'OpenAI extraction failed.',
    })
  }
})

export default openaiExtractNotaPostHandler
