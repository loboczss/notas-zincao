import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
  PROFILE_ADMIN_SELECT,
  toAdminUserRecord,
} from '../_helpers'
import type { AdminUpdateUserStatusPayload } from '../../../../../shared/types/AdminUsers'

export default defineEventHandler(async (event) => {
  const requesterAuthUid = await getCurrentAuthUid(event)
  const client = await getAdminUsersClient(event)

  await assertAdminAccess(client, requesterAuthUid)

  const targetAuthUid = getRouterParam(event, 'authUid')
  if (!targetAuthUid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Usuario alvo nao informado.',
    })
  }

  const body = await readBody<AdminUpdateUserStatusPayload>(event)
  const status = String(body?.status || '').trim().toLowerCase()

  if (status !== 'ativo' && status !== 'inativo') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Status invalido. Use: ativo ou inativo.',
    })
  }

  const now = new Date().toISOString()

  const { data, error } = await (client as any)
    .from('profiles')
    .update({
      deleted_at: status === 'inativo' ? now : null,
      deleted_by: status === 'inativo' ? requesterAuthUid : null,
      updated_by: requesterAuthUid,
      updated_at: now,
    })
    .eq('auth_uid', targetAuthUid)
    .select(PROFILE_ADMIN_SELECT)
    .maybeSingle()

  if (error) {
    console.error('[api/admin/users] status update error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel atualizar o status do usuario.',
    })
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Usuario nao encontrado em profiles.',
    })
  }

  return {
    user: toAdminUserRecord(data),
  }
})
