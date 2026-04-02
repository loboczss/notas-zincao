import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const authUid = user.id || user.sub

  if (!authUid) {
    throw createError({ statusCode: 401, statusMessage: 'Authenticated user id not found.' })
  }

  const body = await readBody<{ nome?: string; foto_perfil?: string }>(event)

  const updateData: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.nome === 'string') {
    updateData.nome = body.nome.trim().slice(0, 120) || null
  }

  if (typeof body.foto_perfil === 'string') {
    updateData.foto_perfil = body.foto_perfil.trim() || null
  }

  const client = await serverSupabaseClient<Database>(event)

  const { data: profile, error } = await (client as any)
    .from('profiles')
    .update(updateData)
    .eq('auth_uid', authUid)
    .select('id, auth_uid, nome, email, role, foto_perfil, ultimo_login, updated_at')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return profile
})
