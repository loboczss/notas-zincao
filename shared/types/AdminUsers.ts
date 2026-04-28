export type AdminUserRole = 'admin' | 'colaborador' | 'operador' | 'visualizador' | 'vendedor' | null

export type AdminUserRoleInput = Exclude<AdminUserRole, null>

export type AdminUserStatus = 'ativo' | 'inativo' | 'pendente'

export type AdminUserRecord = {
  id: string
  auth_uid: string
  nome: string | null
  email: string | null
  role: AdminUserRole
  workspaces: string[] | null
  ultimo_login: string | null
  deleted_at: string | null
  updated_at: string | null
  deleted_by: string | null
  updated_by: string | null
  foto_perfil: string | null
  status: AdminUserStatus
  membro_desde: string | null
}

export type AdminUsersListResponse = {
  users: AdminUserRecord[]
  stats: {
    total: number
    ativos: number
    inativos: number
    pendentes: number
    admins: number
  }
  meta: {
    page: number
    page_size: number
    total_items: number
    total_pages: number
  }
}

export type AdminUsersListQuery = {
  search?: string
  status?: 'todos' | AdminUserStatus
  sort_by?: AdminUsersSortBy
  sort_dir?: AdminUsersSortDir
  page?: number
  page_size?: number
}

export type AdminUsersSortBy = 'nome' | 'email' | 'status' | 'role' | 'membro_desde'

export type AdminUsersSortDir = 'asc' | 'desc'

export type AdminInviteUserPayload = {
  email: string
  nome?: string
  role?: AdminUserRoleInput
}

export type AdminInviteUserResponse = {
  success: boolean
  message: string
  email: string
  role: AdminUserRoleInput
  auth_uid: string | null
  custom_email_sent: boolean
}

export type AdminDeleteUserResponse = {
  success: boolean
  message: string
  auth_uid: string
}

export type AdminResetUserPasswordResponse = {
  success: boolean
  message: string
  auth_uid: string
  email: string
  recovery_email_sent: boolean
  custom_email_sent: boolean
}

export type AdminUpdateUserRolePayload = {
  role: AdminUserRoleInput
}

export type AdminUpdateUserStatusPayload = {
  status: Exclude<AdminUserStatus, 'pendente'>
}

export const isAdminUserRoleInput = (value: unknown): value is AdminUserRoleInput => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'admin' || normalized === 'colaborador' || normalized === 'operador' || normalized === 'visualizador' || normalized === 'vendedor'
}

export const normalizeAdminRole = (value: unknown): AdminUserRole => {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'admin') {
    return 'admin'
  }

  if (normalized === 'colaborador' || normalized === 'operador') {
    return normalized as 'colaborador' | 'operador'
  }

  if (normalized === 'visualizador') {
    return 'visualizador'
  }

  if (normalized === 'vendedor') {
    return 'vendedor'
  }

  return null
}

export const getAdminUserStatus = (user: {
  deleted_at?: string | null
  role?: string | null
}): AdminUserStatus => {
  if (user.deleted_at) {
    return 'inativo'
  }

  if (!normalizeAdminRole(user.role)) {
    return 'pendente'
  }

  return 'ativo'
}
