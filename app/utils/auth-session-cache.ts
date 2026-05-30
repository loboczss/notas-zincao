import type { UserProfile } from '../../shared/types/Profile'

const AUTH_SESSION_CACHE_KEY = 'notas-zincao:auth-session'
const AUTH_PROFILE_CACHE_KEY = 'notas-zincao:auth-profile'

type CachedProfilePayload = {
  profile: UserProfile
  cachedAt: string
}

const canUseStorage = () => {
  return import.meta.client && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

const readJson = <T>(key: string): T | null => {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  }
  catch {
    window.localStorage.removeItem(key)
    return null
  }
}

const writeJson = (key: string, value: unknown) => {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  }
  catch {
    // Storage may be unavailable in private mode or under device quota pressure.
  }
}

export const getCachedAuthProfile = () => {
  const cached = readJson<CachedProfilePayload>(AUTH_PROFILE_CACHE_KEY)
  return cached?.profile ?? null
}

export const cacheAuthProfile = (profile: UserProfile | null | undefined) => {
  if (!canUseStorage()) return

  if (!profile) {
    window.localStorage.removeItem(AUTH_PROFILE_CACHE_KEY)
    return
  }

  writeJson(AUTH_PROFILE_CACHE_KEY, {
    profile,
    cachedAt: new Date().toISOString(),
  } satisfies CachedProfilePayload)
}

export const clearCachedAuthState = () => {
  if (!canUseStorage()) return

  window.localStorage.removeItem(AUTH_SESSION_CACHE_KEY)
  window.localStorage.removeItem(AUTH_PROFILE_CACHE_KEY)
}
