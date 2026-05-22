import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
  normalizeRoleInputOrThrow,
  PROFILE_ADMIN_SELECT,
  toAdminUserRecord,
} from '../../../../utils/admin-users'
import type { AdminUpdateUserProfilePayload } from '../../../../../shared/types/AdminUsers'

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

  const body = await readBody<AdminUpdateUserProfilePayload>(event)
  const nome = String(body?.nome || '').trim().slice(0, 120)
  const normalizedRole = normalizeRoleInputOrThrow(body?.role)

  if (!nome) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nome do usuario e obrigatorio.',
    })
  }

  const { data, error } = await (client as any)
    .from('profiles')
    .update({
      nome,
      role: normalizedRole,
      updated_by: requesterAuthUid,
      updated_at: new Date().toISOString(),
    })
    .eq('auth_uid', targetAuthUid)
    .select(PROFILE_ADMIN_SELECT)
    .maybeSingle()

  if (error) {
    console.error('[api/admin/users] profile update error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel atualizar o usuario.',
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
