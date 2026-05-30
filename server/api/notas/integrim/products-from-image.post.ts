import { serverSupabaseUser } from '#supabase/server'
import type { OpenAINotaExtractionRequest } from '../../../../shared/types/OpenAI'
import type { NotaImageProductsResponse } from '../../../../shared/types/NotasRetirada'
import { extractNotaProductsFromImage } from '../../../services/openai'
import { assertRateLimit } from '../../../utils/rate-limit'

const MAX_IMAGE_DATA_URL_LENGTH = 1_200_000

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sessao expirada. Faca login novamente.',
    })
  }

  assertRateLimit(event, {
    key: 'integrim:products-from-image',
    limit: 10,
    windowMs: 60_000,
    userId: user.id || user.sub,
  })

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
    const produtos = await extractNotaProductsFromImage(event, body.imageDataUrl)
    return {
      success: true,
      produtos,
      missingFields: produtos.length ? [] : ['produtos'],
    } satisfies NotaImageProductsResponse
  }
  catch (error) {
    console.error('[api/notas/integrim/products-from-image] error:', error instanceof Error ? error.message : 'unknown error')
    throw createError({
      statusCode: 502,
      statusMessage: 'Nao foi possivel ler os produtos da foto.',
    })
  }
})
