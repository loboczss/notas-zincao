import {
  DEFAULT_MAX_PAGES,
  INTEGRIM_PAGE_SIZE,
  REQUEST_TIMEOUT_MS,
} from './constants'
import type {
  CompanyPagePlan,
  IntegrimClause,
  IntegrimConfig,
  IntegrimOrder,
  IntegrimPagedResponse,
  IntegrimRecord,
} from './types'
import { IntegrimHttpError } from './types'
import { stringOrNull, toInteger } from './utils'

const TOKEN_MAX_RETRIES = 6
const TOKEN_TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const backoffMs = (attempt: number) => {
  const base = Math.min(8000, 500 * 2 ** (attempt - 1))
  return base + Math.floor(Math.random() * 400)
}

const fetchWithTimeout = async (url: string, init: RequestInit) => {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  }
  catch (error) {
    console.error('[stock-integrin] Integrim request failed:', error instanceof Error ? error.message : error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Nao foi possivel conectar na Integrim.',
    })
  }
}

export const getFreshAccessToken = async (config: IntegrimConfig) => {
  const body = new URLSearchParams()
  body.set('grant_type', 'password')
  body.set('username', config.username)
  body.set('password', config.password)
  body.set('client_id', config.clientId)
  body.set('client_secret', config.clientSecret)

  let lastStatus = 0
  let lastBody = ''

  for (let attempt = 1; attempt <= TOKEN_MAX_RETRIES; attempt += 1) {
    const response = await fetchWithTimeout(`${config.baseUrl}/cisspoder-auth/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'ngrok-skip-browser-warning': 'true',
      },
      body,
    })

    const responseBody = await response.text()
    const contentType = response.headers.get('content-type') || ''
    const transientNgrokHtml = response.status === 403
      && contentType.includes('text/html')
      && /ngrok|<!doctype html/i.test(responseBody)

    if (!response.ok) {
      lastStatus = response.status
      lastBody = responseBody

      if ((TOKEN_TRANSIENT_STATUS.has(response.status) || transientNgrokHtml) && attempt < TOKEN_MAX_RETRIES) {
        await sleep(backoffMs(attempt))
        continue
      }

      throw new IntegrimHttpError('oauth/token', response.status, responseBody)
    }

    const json = JSON.parse(responseBody || '{}') as { access_token?: unknown }
    const token = stringOrNull(json.access_token)
    if (!token) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Integrim nao retornou token de acesso.',
      })
    }

    return token
  }

  throw new IntegrimHttpError('oauth/token', lastStatus || 502, lastBody || 'Falha ao obter token Integrim.')
}

const parseIntegrimResponse = <T>(json: unknown): IntegrimPagedResponse<T> => {
  if (Array.isArray(json)) {
    return {
      data: json as T[],
      total: json.length,
      hasNext: false,
    }
  }

  if (!json || typeof json !== 'object') {
    return { data: [], total: 0, hasNext: false }
  }

  const record = json as Record<string, unknown>
  const data = Array.isArray(record.data) ? record.data : []

  return {
    data: data as T[],
    total: Number(record.total ?? record.Total ?? data.length) || data.length,
    hasNext: Boolean(record.hasNext),
  }
}

export const postIntegrimServicePage = async <T>(
  config: IntegrimConfig,
  token: string,
  service: string,
  page: number,
  clausulas: IntegrimClause[],
  ordenacoes: IntegrimOrder[],
) => {
  const response = await fetchWithTimeout(`${config.baseUrl}/cisspoder-service/${service}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      page,
      limit: INTEGRIM_PAGE_SIZE,
      clausulas,
      ordenacoes,
    }),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new IntegrimHttpError(service, response.status, body)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new IntegrimHttpError(service, response.status, body.slice(0, 600))
  }

  return parseIntegrimResponse<T>(JSON.parse(body || '{}'))
}

export const getPageCount = (result: IntegrimPagedResponse<unknown>, maxPages = DEFAULT_MAX_PAGES) => {
  if (!result.data.length) return 0
  if (!result.hasNext) return 1

  const pageSize = Math.max(result.data.length, 1)
  const pageCount = Math.ceil(result.total / pageSize)
  return Math.min(Math.max(pageCount, 1), maxPages)
}

export const fetchIntegrimAllPages = async <T>(
  config: IntegrimConfig,
  token: string,
  service: string,
  clausulas: IntegrimClause[],
  ordenacoes: IntegrimOrder[],
  maxPages: number,
) => {
  const first = await postIntegrimServicePage<T>(config, token, service, 1, clausulas, ordenacoes)
  const rows = [...first.data]
  const pageCount = getPageCount(first, maxPages)

  for (let page = 2; page <= pageCount; page += 1) {
    const result = await postIntegrimServicePage<T>(config, token, service, page, clausulas, ordenacoes)
    rows.push(...result.data)
  }

  return rows
}

export const fetchSaldoPage = async (
  config: IntegrimConfig,
  token: string,
  idempresa: number,
  page: number,
) => {
  return await postIntegrimServicePage<IntegrimRecord>(
    config,
    token,
    'produtos_saldo_estoque_empresa',
    page,
    [{ campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: idempresa }],
    [{ campo: 'idproduto', direcao: 'ASC' }],
  )
}

export const createCompanyPagePlans = async (
  config: IntegrimConfig,
  token: string,
  companyIds: number[],
  maxPages: number,
): Promise<CompanyPagePlan[]> => {
  const plans: CompanyPagePlan[] = []

  for (const idempresa of companyIds) {
    const firstPage = await fetchSaldoPage(config, token, idempresa, 1)
    plans.push({
      idempresa,
      firstPage,
      totalPages: getPageCount(firstPage, maxPages),
      totalRows: toInteger(firstPage.total) || firstPage.data.length,
    })
  }

  return plans
}
