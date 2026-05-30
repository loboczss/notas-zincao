import type { H3Event } from 'h3'
import { createError, getHeader, setHeader } from 'h3'

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
  userId?: string | null
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()
let nextCleanupAt = 0

const getFirstHeaderValue = (value?: string | null) => String(value || '').split(',')[0]?.trim() || ''

const getClientIp = (event: H3Event) => {
  return getFirstHeaderValue(getHeader(event, 'x-forwarded-for'))
    || getFirstHeaderValue(getHeader(event, 'cf-connecting-ip'))
    || getFirstHeaderValue(getHeader(event, 'x-real-ip'))
    || 'unknown'
}

const cleanupExpiredBuckets = (now: number) => {
  if (nextCleanupAt > now) {
    return
  }

  for (const [bucketKey, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(bucketKey)
    }
  }

  nextCleanupAt = now + 60_000
}

export const assertRateLimit = (event: H3Event, options: RateLimitOptions) => {
  const now = Date.now()
  cleanupExpiredBuckets(now)

  const identity = `${options.key}:${options.userId || 'anonymous'}:${getClientIp(event)}`
  const current = buckets.get(identity)

  if (!current || current.resetAt <= now) {
    buckets.set(identity, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return
  }

  if (current.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    setHeader(event, 'Retry-After', retryAfterSeconds)
    throw createError({
      statusCode: 429,
      statusMessage: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    })
  }

  current.count += 1
}
