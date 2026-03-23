import type { SupabaseClient } from '@supabase/supabase-js'
import type { SignInPayload } from '../../../../shared/types/Auth'
import type { Database } from '../../../types/database.types'

export async function signInWithEmailAndPassword(
  supabase: SupabaseClient<Database>,
  payload: SignInPayload,
) {
  return supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  })
}
