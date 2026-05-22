import type { Session } from '@supabase/supabase-js'
import { useSupabaseClient, useSupabaseSession } from '#imports'
import type { Database } from '../types/database.types'
import { isNetworkFetchError } from './api-errors'
import { cacheAuthSession, getCachedAuthSession } from './auth-session-cache'

const isClientOffline = () => {
  return import.meta.client && typeof navigator !== 'undefined' && !navigator.onLine
}

export const resolveAuthSessionForRoute = async (): Promise<Session | null> => {
  const routeSession = useSupabaseSession()

  if (routeSession.value) {
    if (import.meta.client) cacheAuthSession(routeSession.value as Session)
    return routeSession.value as Session
  }

  if (!import.meta.client) return null

  const cachedSession = getCachedAuthSession()

  if (cachedSession && isClientOffline()) {
    routeSession.value = cachedSession
    return cachedSession
  }

  try {
    const supabase = useSupabaseClient<Database>()
    const { data, error } = await supabase.auth.getSession()

    if (!error && data.session) {
      routeSession.value = data.session
      cacheAuthSession(data.session)
      return data.session
    }

    if (cachedSession && error && isNetworkFetchError(error)) {
      routeSession.value = cachedSession
      return cachedSession
    }
  }
  catch (error) {
    if (cachedSession && (isClientOffline() || isNetworkFetchError(error))) {
      routeSession.value = cachedSession
      return cachedSession
    }
  }

  return null
}
