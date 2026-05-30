import { serverSupabaseUser } from '#supabase/server'
import type { OpenAINotaExtractionRequest } from '../../../../shared/types/OpenAI'
import type { NotaIntegrimLookupResponse } from '../../../../shared/types/NotasRetirada'
import { lookupNotaIntegrim } from '../../../services/integrim/client'
import { extractNotaLookupHintsFromImage, extractNotaProductsFromImage } from '../../../services/openai'
import { assertRateLimit } from '../../../utils/rate-limit'

const MAX_IMAGE_DATA_URL_LENGTH = 1_200_000

const isHttpError = (error: unknown) => Boolean(error && typeof error === 'object' && 'statusCode' in error)

const applyAiChaveToDraft = (
  response: NotaIntegrimLookupResponse,
  chaveNfe: string,
): NotaIntegrimLookupResponse => {
  if (!response.draft) return response

  return {
    ...response,
    draft: {
      ...response.draft,
      chave_nfe: chaveNfe,
    },
    missingFields: chaveNfe
      ? (response.missingFields || []).filter(field => field !== 'chave_nfe')
      : Array.from(new Set([...(response.missingFields || []), 'chave_nfe'])),
  }
}

const applyImageProductsFallback = async (
  event: Parameters<typeof useRuntimeConfig>[0],
  response: NotaIntegrimLookupResponse,
  imageDataUrl: string,
): Promise<NotaIntegrimLookupResponse> => {
  if (!response.draft || response.draft.produtos?.length) return response

  try {
    const produtos = await extractNotaProductsFromImage(event, imageDataUrl)
    if (!produtos.length) return response

    return {
      ...response,
      draft: {
        ...response.draft,
        produtos,
      },
      missingFields: (response.missingFields || []).filter(field => field !== 'produtos'),
    }
  }
  catch (error) {
    console.warn('[api/notas/integrim/lookup-from-image] product fallback failed:', error instanceof Error ? error.message : 'unknown error')
    return response
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sessao expirada. Faca login novamente.',
    })
  }

  assertRateLimit(event, {
    key: 'integrim:lookup-from-image',
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
    const hints = await extractNotaLookupHintsFromImage(event, body.imageDataUrl)

    if (!hints.numero_nota) {
      return {
        success: true,
        found: false,
        message: 'Nao consegui identificar o numero da nota na foto. Informe o numero manualmente para buscar.',
        candidates: [],
        hints,
      } satisfies NotaIntegrimLookupResponse
    }

    const lookupResponse = await lookupNotaIntegrim({
      numeroNota: hints.numero_nota,
      serieNota: hints.serie_nota || null,
    })

    const withChave = applyAiChaveToDraft(lookupResponse, hints.chave_nfe)
    const enrichedResponse = await applyImageProductsFallback(event, withChave, body.imageDataUrl)

    return {
      ...enrichedResponse,
      hints,
    } satisfies NotaIntegrimLookupResponse
  }
  catch (error) {
    if (isHttpError(error)) throw error

    console.error('[api/notas/integrim/lookup-from-image] lookup failed:', error instanceof Error ? error.message : 'unknown error')
    throw createError({
      statusCode: 502,
      statusMessage: 'Nao foi possivel identificar a nota pela foto.',
    })
  }
})
