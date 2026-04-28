export type UserProfile = {
  id: string
  auth_uid: string
  nome: string | null
  email: string | null
  role: string | null
  workspaces?: string[] | null
  deleted_at?: string | null
  deleted_by?: string | null
  updated_by?: string | null
  foto_perfil: string | null
  ultimo_login: string | null
  updated_at: string | null
}
