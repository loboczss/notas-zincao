import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
  getSupabaseAdminConfigOrThrow,
} from './_helpers'

export default defineEventHandler(async (event) => {
  const requesterAuthUid = await getCurrentAuthUid(event)
  const client = await getAdminUsersClient(event)

  await assertAdminAccess(client, requesterAuthUid)

  let supabaseUrl = ''
  let serviceRoleKey = ''

  try {
    const config = getSupabaseAdminConfigOrThrow()
    supabaseUrl = config.supabaseUrl
    serviceRoleKey = config.serviceRoleKey
  }
  catch {
    return {
      ok: false,
      configured: false,
      status: 0,
      message: 'SUPABASE_URL e chave de servico (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEY) sao obrigatorios.',
    }
  }

  try {
    // Read-only admin call to validate service-role auth without sending invites.
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`, {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const message = (payload as { msg?: string; error_description?: string; error?: string } | null)?.msg
        || (payload as { msg?: string; error_description?: string; error?: string } | null)?.error_description
        || (payload as { msg?: string; error_description?: string; error?: string } | null)?.error
        || 'Falha ao validar endpoint admin do Supabase Auth.'

      return {
        ok: false,
        configured: true,
        status: response.status,
        message,
      }
    }

    return {
      ok: true,
      configured: true,
      status: response.status,
      message: 'Health-check do convite aprovado. Supabase Auth admin esta operacional.',
    }
  }
  catch (error) {
    return {
      ok: false,
      configured: true,
      status: 0,
      message: error instanceof Error ? error.message : 'Erro de rede ao validar health-check do convite.',
    }
  }
})
