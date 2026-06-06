import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
  PROFILE_ADMIN_SELECT,
  setSupabaseAuthUserBanned,
  toAdminUserRecord,
} from '../../../../utils/admin-users'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { AdminDeleteUserResponse } from '../../../../../shared/types/AdminUsers'
import { assertRateLimit } from '../../../../utils/rate-limit'

export default defineEventHandler(async (event): Promise<AdminDeleteUserResponse> => {
  const requesterAuthUid = await getCurrentAuthUid(event)
  assertRateLimit(event, {
    key: 'admin:mutation',
    limit: 30,
    windowMs: 60_000,
    userId: requesterAuthUid,
  })

  const client = await getAdminUsersClient(event)

  await assertAdminAccess(client, requesterAuthUid)

  const targetAuthUid = getRouterParam(event, 'authUid')
  if (!targetAuthUid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Usuario alvo nao informado.',
    })
  }

  if (targetAuthUid === requesterAuthUid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nao e permitido excluir o proprio usuario administrador.',
    })
  }

  const now = new Date().toISOString()

  // Usamos serverSupabaseServiceRole para fazer bypass no RLS e permitir que o admin inative outros perfis.
  const serviceRoleClient = serverSupabaseServiceRole(event)

  const { data, error: profileUpdateError } = await serviceRoleClient
    .from('profiles')
    .update({
      deleted_at: now,
      deleted_by: requesterAuthUid,
      updated_by: requesterAuthUid,
      updated_at: now,
    })
    .eq('auth_uid', targetAuthUid)
    .select(PROFILE_ADMIN_SELECT)
    .maybeSingle()

  if (profileUpdateError) {
    console.error('[api/admin/users] soft delete profile error:', profileUpdateError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel inativar o usuario.',
    })
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Usuario nao encontrado em profiles.',
    })
  }

  const authBanned = await setSupabaseAuthUserBanned(event, targetAuthUid, true)

  return {
    success: true,
    message: authBanned
      ? 'Usuario inativado com sucesso.'
      : 'Usuario inativado no sistema, mas nao foi possivel bloquear o login no Supabase Auth.',
    auth_uid: targetAuthUid,
    auth_banned: authBanned,
    user: toAdminUserRecord(data),
  }
})
