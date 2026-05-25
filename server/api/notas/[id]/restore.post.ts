import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../app/types/database.types'
import { restoreNotaRetirada } from '../../../services/notas/restore'
import { assertActiveProfileRole, getAuthUidOrThrow } from '../../../utils/permissions'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const normalizeNoteId = (rawId: string | undefined) => {
  const id = String(rawId || '').trim()

  if (!UUID_RE.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da nota invalido.',
    })
  }

  return id
}

const assertEmptyRestorePayload = (event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]) => {
  const contentLengthHeader = getRequestHeader(event, 'content-length')
  const transferEncoding = getRequestHeader(event, 'transfer-encoding')
  const contentLength = Number(contentLengthHeader || 0)

  if ((Number.isFinite(contentLength) && contentLength > 0) || transferEncoding) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A restauracao nao aceita payload.',
    })
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  assertEmptyRestorePayload(event)

  const authUid = getAuthUidOrThrow(user)
  const id = normalizeNoteId(getRouterParam(event, 'id'))

  const client = await serverSupabaseClient<Database>(event) as SupabaseClient<Database>
  await assertActiveProfileRole(
    client as any,
    authUid,
    ['admin'],
    'Apenas administradores podem restaurar notas.',
  )

  const nota = await restoreNotaRetirada(client, id)

  return {
    success: true,
    restoredId: id,
    nota,
  }
})
