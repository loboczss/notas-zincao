import { DEFAULT_COMPANY_IDS } from './constants'
import type { IntegrimConfig } from './types'
import { normalizeBaseUrl, parsePositiveInteger } from './utils'

const parseCompanyIds = (value?: string) => {
  const ids = String(value || '')
    .split(',')
    .map(item => parsePositiveInteger(item))
    .filter((item): item is number => item !== null)

  return ids.length ? [...new Set(ids)] : DEFAULT_COMPANY_IDS
}

export const getIntegrimConfig = (): IntegrimConfig => {
  const config = {
    baseUrl: normalizeBaseUrl(process.env.INTEGRIM_BASE_URL),
    username: String(process.env.INTEGRIM_USERNAME || '').trim(),
    password: String(process.env.INTEGRIM_PASSWORD || '').trim(),
    clientId: String(process.env.INTEGRIM_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.INTEGRIM_CLIENT_SECRET || '').trim(),
    companyIds: parseCompanyIds(process.env.INTEGRIM_COMPANY_IDS),
  }

  if (!config.baseUrl || !config.username || !config.password || !config.clientId || !config.clientSecret) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Integrim nao esta configurada no servidor.',
    })
  }

  return config
}
