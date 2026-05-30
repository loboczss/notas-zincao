import { serverSupabaseUser } from '#supabase/server'
import type { NotaIntegrimLookupRequest } from '../../../../shared/types/NotasRetirada'
import { lookupNotaIntegrim } from '../../../services/integrim/client'
import { assertRateLimit } from '../../../utils/rate-limit'

const isHttpError = (error: unknown) => Boolean(error && typeof error === 'object' && 'statusCode' in error)

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sessao expirada. Faca login novamente.',
    })
  }

  assertRateLimit(event, {
    key: 'integrim:lookup',
    limit: 30,
    windowMs: 60_000,
    userId: user.id || user.sub,
  })

  let body: NotaIntegrimLookupRequest
  try {
    body = await readBody<NotaIntegrimLookupRequest>(event)
  }
  catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Corpo da requisicao invalido.',
    })
  }

  try {
    return await lookupNotaIntegrim({
      numeroNota: body?.numero_nota,
      serieNota: body?.serie_nota,
      idempresa: body?.idempresa,
      idplanilha: body?.idplanilha,
    })
  }
  catch (error) {
    if (isHttpError(error)) throw error

    console.error('[api/notas/integrim/lookup] lookup failed:', error instanceof Error ? error.message : 'unknown error')
    throw createError({
      statusCode: 502,
      statusMessage: 'Nao foi possivel consultar a nota na Integrim.',
    })
  }
})
