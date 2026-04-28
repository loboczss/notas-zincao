import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import {
  getAdminUserStatus,
  isAdminUserRoleInput,
  normalizeAdminRole,
  type AdminUserRecord,
  type AdminUserRoleInput,
} from '../../../../shared/types/AdminUsers'

type AdminUsersClient = Awaited<ReturnType<typeof serverSupabaseClient<Database>>>

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export const PROFILE_ADMIN_SELECT = 'id, auth_uid, nome, email, role, workspaces, ultimo_login, deleted_at, updated_at, deleted_by, updated_by, foto_perfil'

export const getCurrentAuthUid = async (event: H3Event): Promise<string> => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const authUid = user.id || user.sub

  if (!authUid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authenticated user id not found.',
    })
  }

  return authUid
}

export const getAdminUsersClient = async (event: H3Event): Promise<AdminUsersClient> => {
  return await serverSupabaseClient<Database>(event)
}

export const assertAdminAccess = async (client: AdminUsersClient, authUid: string) => {
  const { data, error } = await (client as any)
    .from('profiles')
    .select('role, deleted_at')
    .eq('auth_uid', authUid)
    .maybeSingle()

  if (error) {
    console.error('[api/admin/users] admin check error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Falha ao validar permissao de administrador.',
    })
  }

  const role = normalizeAdminRole((data as { role?: string | null } | null)?.role)
  if ((data as { deleted_at?: string | null } | null)?.deleted_at || role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Acesso permitido apenas para administradores.',
    })
  }
}

export const toAdminUserRecord = (row: ProfileRow): AdminUserRecord => {
  const status = getAdminUserStatus(row)

  return {
    ...row,
    role: normalizeAdminRole(row.role),
    status,
    membro_desde: row.updated_at || row.ultimo_login || null,
  }
}

export const normalizeRoleInputOrThrow = (value: unknown): AdminUserRoleInput => {
  if (!isAdminUserRoleInput(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role invalida. Use: admin, colaborador, operador ou visualizador.',
    })
  }

  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'admin' || normalized === 'colaborador' || normalized === 'operador' || normalized === 'visualizador') {
    return normalized
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Role invalida.',
  })
}

export const getSupabaseAdminConfigOrThrow = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 501,
      statusMessage: 'SUPABASE_URL e chave de servico (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEY) sao obrigatorios.',
    })
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  }
}
