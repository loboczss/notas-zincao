import { serverSupabaseUser } from '#supabase/server'
import type { OpenAINotaExtractionRequest } from '../../../shared/types/OpenAI'
import { extractNotaFromImage } from '../../services/openai'

const MAX_IMAGE_DATA_URL_LENGTH = 1_200_000

export const openaiExtractNotaPostHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  let body: OpenAINotaExtractionRequest
  try {
    body = await readBody<OpenAINotaExtractionRequest>(event)
  }
  catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Imagem invalida para leitura.',
    })
  }

  if (!body?.imageDataUrl || !body.imageDataUrl.startsWith('data:image/')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Imagem da nota e obrigatoria.',
    })
  }

  if (body.imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Imagem muito grande. Tire uma foto mais proxima do cupom ou recorte a imagem antes de analisar.',
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
