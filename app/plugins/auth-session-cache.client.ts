import type { Session } from '@supabase/supabase-js'
import { useSupabaseClient, useSupabaseSession } from '#imports'
import type { Database } from '../types/database.types'
import { isNetworkFetchError } from '../utils/api-errors'
import {
  cacheAuthSession,
  clearCachedAuthState,
  getCachedAuthSession,
} from '../utils/auth-session-cache'

const isOffline = () => typeof navigator !== 'undefined' && !navigator.onLine

export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient<Database>()
  const currentSession = useSupabaseSession()

  const hydrateFromCache = () => {
    const cachedSession = getCachedAuthSession()
    if (!cachedSession) return null

    currentSession.value = cachedSession as Session
    return cachedSession
  }

  if (!currentSession.value && isOffline()) {
    hydrateFromCache()
  }

  try {
    const { data, error } = await supabase.auth.getSession()

    if (!error && data.session) {
      currentSession.value = data.session
      cacheAuthSession(data.session)
    }
    else if (!currentSession.value && isOffline()) {
      hydrateFromCache()
    }
  }
  catch (error) {
    if (!currentSession.value && (isOffline() || isNetworkFetchError(error))) {
      hydrateFromCache()
    }
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      cacheAuthSession(session)
      return
    }

    if (event === 'SIGNED_OUT') {
      clearCachedAuthState()
      return
    }

    if (!currentSession.value && isOffline()) {
      hydrateFromCache()
    }
  })

  window.addEventListener('offline', () => {
    if (!currentSession.value) {
      hydrateFromCache()
    }
  })
})
