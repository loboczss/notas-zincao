import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
  getSupabaseAdminConfigOrThrow,
} from '../_helpers'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { AdminDeleteUserResponse } from '../../../../../shared/types/AdminUsers'

export default defineEventHandler(async (event): Promise<AdminDeleteUserResponse> => {
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

  if (targetAuthUid === requesterAuthUid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nao e permitido excluir o proprio usuario administrador.',
    })
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminConfigOrThrow()

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetAuthUid}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  })

  if (!authResponse.ok && authResponse.status !== 404) {
    const payload = await authResponse.json().catch(() => null)
    const message = (payload as { msg?: string; error_description?: string; error?: string } | null)?.msg
      || (payload as { msg?: string; error_description?: string; error?: string } | null)?.error_description
      || (payload as { msg?: string; error_description?: string; error?: string } | null)?.error
      || 'Falha ao excluir usuario no Supabase Auth.'

    throw createError({
      statusCode: authResponse.status,
      statusMessage: message,
    })
  }

  // Usamos serverSupabaseServiceRole para fazer bypass no RLS e permitir que o admin delete outros perfis
  const serviceRoleClient = serverSupabaseServiceRole(event)

  const { error: profileDeleteError } = await serviceRoleClient
    .from('profiles')
    .delete()
    .eq('auth_uid', targetAuthUid)

  if (profileDeleteError) {
    console.error('[api/admin/users] delete profile error:', profileDeleteError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Usuario removido no auth, mas falhou ao excluir registro em profiles.',
    })
  }

  return {
    success: true,
    message: 'Usuario excluido com sucesso.',
    auth_uid: targetAuthUid,
  }
})
