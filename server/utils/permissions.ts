import { createError } from 'h3'

type SupabaseLikeClient = {
  from: (table: string) => any
}

type SupabaseUserLike = {
  id?: string | null
  sub?: string | null
}

export const NOTE_CREATOR_ROLES = ['admin', 'colaborador', 'vendedor'] as const
export const NOTE_OPERATOR_ROLES = ['admin', 'colaborador', 'vendedor'] as const

export const getAuthUidOrThrow = (user: SupabaseUserLike | null | undefined) => {
  const authUid = user?.id || user?.sub

  if (!authUid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authenticated user id not found.',
    })
  }

  return authUid
}

export const getActiveProfileRole = async (client: SupabaseLikeClient, authUid: string) => {
  const { data, error } = await client
    .from('profiles')
    .select('role, deleted_at')
    .eq('auth_uid', authUid)
    .maybeSingle()

  if (error) {
    console.error('[authz] profile role check error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel validar permissoes do usuario.',
    })
  }

  if (!data || data.deleted_at) {
    return null
  }

  return String(data.role || '').trim().toLowerCase()
}

export const assertActiveProfileRole = async (
  client: SupabaseLikeClient,
  authUid: string,
  allowedRoles: string[],
  statusMessage = 'Acesso negado.',
) => {
  const role = await getActiveProfileRole(client, authUid)

  if (!role || !allowedRoles.includes(role)) {
    throw createError({
      statusCode: 403,
      statusMessage,
    })
  }

  return role
}

export const assertCanCreateNota = async (client: SupabaseLikeClient, authUid: string) => {
  return assertActiveProfileRole(
    client,
    authUid,
    [...NOTE_CREATOR_ROLES],
    'Somente administradores, colaboradores ou vendedores ativos podem cadastrar notas.',
  )
}
