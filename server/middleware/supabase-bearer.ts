import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database.types'

export default defineEventHandler((event) => {
  const authorization = getHeader(event, 'authorization')
  if (!authorization || !/^Bearer\s+\S+/i.test(authorization)) return
  const bearerToken = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!bearerToken) return

  const { public: publicConfig } = useRuntimeConfig(event)
  const supabaseConfig = publicConfig.supabase
  if (!supabaseConfig?.url || !supabaseConfig?.key) return

  const client = createClient<Database>(supabaseConfig.url, supabaseConfig.key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  })

  const auth = client.auth as typeof client.auth & {
    getClaims: (...args: unknown[]) => unknown
    getUser: (...args: unknown[]) => unknown
  }
  const getClaims = auth.getClaims.bind(auth)
  const getUser = auth.getUser.bind(auth)

  auth.getClaims = ((jwtOrOptions?: unknown, maybeOptions?: unknown) => {
    const hasExplicitToken = typeof jwtOrOptions === 'string' && jwtOrOptions.trim().length > 0
    const token = hasExplicitToken ? jwtOrOptions : bearerToken
    const options = hasExplicitToken ? maybeOptions : jwtOrOptions

    return getClaims(token, options)
  }) as typeof auth.getClaims

  auth.getUser = ((jwt?: unknown) => {
    return getUser(typeof jwt === 'string' && jwt.trim().length > 0 ? jwt : bearerToken)
  }) as typeof auth.getUser

  event.context._supabaseClient = client
})
