import type { H3Event } from 'h3'
import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
} from './admin-users'
import { assertRateLimit } from './rate-limit'

type StockIntegrinAuthOptions = {
  key: string
  adminLimit: number
  serviceRoleLimit: number
  windowMs?: number
}

type StockIntegrinAuthResult = {
  triggeredBy: 'admin' | 'supabase-service-role'
}

const hasServiceRoleBearer = (event: H3Event) => {
  const authorization = String(getHeader(event, 'authorization') || '').trim()
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SECRET_KEY
    || '',
  ).trim()

  return Boolean(token && serviceRoleKey && token === serviceRoleKey)
}

export const authorizeStockIntegrinAdminOrServiceRole = async (
  event: H3Event,
  options: StockIntegrinAuthOptions,
): Promise<StockIntegrinAuthResult> => {
  const windowMs = options.windowMs ?? 60 * 60 * 1000

  if (hasServiceRoleBearer(event)) {
    assertRateLimit(event, {
      key: options.key,
      limit: options.serviceRoleLimit,
      windowMs,
      userId: 'service-role',
    })

    return { triggeredBy: 'supabase-service-role' }
  }

  const client = await getAdminUsersClient(event)
  const authUid = await getCurrentAuthUid(event)
  await assertAdminAccess(client, authUid)

  assertRateLimit(event, {
    key: options.key,
    limit: options.adminLimit,
    windowMs,
    userId: authUid,
  })

  return { triggeredBy: 'admin' }
}
