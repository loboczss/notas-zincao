import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../app/types/database.types'

export default defineEventHandler((event) => {
  const authorization = getHeader(event, 'authorization')
  if (!authorization || !/^Bearer\s+\S+/i.test(authorization)) return

  const { public: publicConfig } = useRuntimeConfig(event)
  const supabaseConfig = publicConfig.supabase
  if (!supabaseConfig?.url || !supabaseConfig?.key) return

  event.context._supabaseClient = createClient<Database>(supabaseConfig.url, supabaseConfig.key, {
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
})
