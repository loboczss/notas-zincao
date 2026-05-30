import { $fetch, type $Fetch } from 'ofetch'
import { useRuntimeConfig, useSupabaseClient } from '#imports'
import { useRequestFetch } from '#app/composables/ssr'

const normalizeApiBaseUrl = (value?: string) => String(value || '').trim().replace(/\/+$/, '')

export const getApiBaseUrl = () => {
  const config = useRuntimeConfig()
  return normalizeApiBaseUrl(config.public.apiBaseUrl)
}

export const getApiUrl = (path: string) => {
  const apiBaseUrl = getApiBaseUrl()
  if (!apiBaseUrl) return path

  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

const resolveSupabaseClient = () => {
  if (!import.meta.client) return null

  try {
    return useSupabaseClient()
  }
  catch {
    return null
  }
}

export const getApiAuthHeaders = async (supabaseClient = resolveSupabaseClient()) => {
  const headers = new Headers()
  if (!supabaseClient) return headers

  try {
    const { data } = await supabaseClient.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }
  catch {
    // Same-origin SSR/browser requests can still rely on Supabase cookies.
  }

  return headers
}

export const getApiFetch = (): $Fetch => {
  const apiBaseUrl = getApiBaseUrl()
  const supabaseClient = resolveSupabaseClient()

  if (!apiBaseUrl) {
    return useRequestFetch() as unknown as $Fetch
  }

  return $fetch.create({
    baseURL: apiBaseUrl,
    async onRequest({ options }) {
      const authHeaders = await getApiAuthHeaders(supabaseClient)
      const headers = new Headers(options.headers as HeadersInit)
      authHeaders.forEach((value, key) => headers.set(key, value))
      options.headers = headers
    },
  }) as unknown as $Fetch
}
