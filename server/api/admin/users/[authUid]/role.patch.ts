import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
  normalizeRoleInputOrThrow,
  PROFILE_ADMIN_SELECT,
  toAdminUserRecord,
} from '../_helpers'
import type { AdminUpdateUserRolePayload } from '../../../../../shared/types/AdminUsers'

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

  const body = await readBody<AdminUpdateUserRolePayload>(event)
  const normalizedRole = normalizeRoleInputOrThrow(body?.role)

  const { data, error } = await (client as any)
    .from('profiles')
    .update({
      role: normalizedRole,
      updated_by: requesterAuthUid,
      updated_at: new Date().toISOString(),
    })
    .eq('auth_uid', targetAuthUid)
    .select(PROFILE_ADMIN_SELECT)
    .maybeSingle()

  if (error) {
    console.error('[api/admin/users] role update error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel atualizar a permissao do usuario.',
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
