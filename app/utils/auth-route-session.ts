import type { Session } from '@supabase/supabase-js'
import { useSupabaseClient, useSupabaseSession } from '#imports'
import type { Database } from '../types/database.types'

export const resolveAuthSessionForRoute = async (): Promise<Session | null> => {
  const routeSession = useSupabaseSession()

  if (routeSession.value) {
    return routeSession.value as Session
  }

  if (!import.meta.client) return null

  try {
    const supabase = useSupabaseClient<Database>()
    const { data, error } = await supabase.auth.getSession()

    if (!error && data.session) {
      routeSession.value = data.session
      return data.session
    }
  }
  catch {
    return null
  }

  return null
}
