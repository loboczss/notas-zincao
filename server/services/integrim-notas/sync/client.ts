import { getFreshAccessToken } from '../../stock-integrin/sync/integrim-client'
import type {
  IntegrimClause,
  IntegrimConfig,
  IntegrimOrder,
  IntegrimPagedResponse,
  IntegrimRecord,
} from '../../stock-integrin/sync/types'
import { IntegrimHttpError } from '../../stock-integrin/sync/types'
import { toInteger } from '../../stock-integrin/sync/utils'
import { ITENS_PAGE_SIZE, MAX_PAGES_PER_QUERY } from './constants'
import type { CompanyModelPlan } from './types'

export { getFreshAccessToken }

const DOCUMENTOS_SERVICE = 'documentos_fiscais_saida'
const ITENS_SERVICE = 'itens_documentos_fiscais_saida'
const REQUEST_TIMEOUT_MS = 45_000
const MAX_RETRIES = 6
// Status transitorios (incl. 503 do ngrok) que devem ser repetidos com backoff.
const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const backoffMs = (attempt: number) => {
  const base = Math.min(8000, 500 * 2 ** (attempt - 1))
  return base + Math.floor(Math.random() * 400)
}

// Mantem o token Integrim renovavel ao longo de um sync longo (o token expira).
export type TokenManager = {
  get: () => string
  refresh: () => Promise<string>
}

export const createTokenManager = async (config: IntegrimConfig): Promise<TokenManager> => {
  let token = await getFreshAccessToken(config)
  return {
    get: () => token,
    refresh: async () => {
      token = await getFreshAccessToken(config)
      return token
    },
  }
}

const parseResponse = (json: unknown): IntegrimPagedResponse<IntegrimRecord> => {
  if (Array.isArray(json)) {
    return { data: json as IntegrimRecord[], total: json.length, hasNext: false }
  }

  if (json && typeof json === 'object') {
    const record = json as Record<string, unknown>
    const data = Array.isArray(record.data) ? (record.data as IntegrimRecord[]) : []
    return {
      data,
      total: Number(record.total ?? record.Total ?? data.length) || data.length,
      hasNext: Boolean(record.hasNext),
    }
  }

  return { data: [], total: 0, hasNext: false }
}

// Mesma forma de requisicao do lookup ja em producao, com retry/backoff para erros
// transitorios e renovacao de token em 401. O Integrim fica atras de ngrok, que
// ocasionalmente devolve 503 durante syncs longos.
const postNotasServicePage = async (
  config: IntegrimConfig,
  tokens: TokenManager,
  service: string,
  page: number,
  clausulas: IntegrimClause[],
  ordenacoes: IntegrimOrder[],
  limit?: number,
) => {
  const url = `${config.baseUrl}/cisspoder-service/${service}`
  const body: Record<string, unknown> = { page, clausulas, ordenacoes }
  if (limit && limit > 0) body.limit = limit
  const payload = JSON.stringify(body)
  let lastDetail = ''

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.get()}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: payload,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    }
    catch (error) {
      lastDetail = error instanceof Error ? error.message : String(error)
      if (attempt < MAX_RETRIES) {
        await sleep(backoffMs(attempt))
        continue
      }
      throw createError({ statusCode: 502, statusMessage: 'Nao foi possivel conectar na Integrim.' })
    }

    const text = await response.text()

    if (response.status === 401 && attempt < MAX_RETRIES) {
      await tokens.refresh()
      await sleep(250)
      continue
    }

    if (TRANSIENT_STATUS.has(response.status) && attempt < MAX_RETRIES) {
      lastDetail = `HTTP ${response.status}`
      await sleep(backoffMs(attempt))
      continue
    }

    if (!response.ok) {
      throw new IntegrimHttpError(service, response.status, text.slice(0, 600))
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      lastDetail = `resposta nao-JSON (${contentType || 'sem content-type'})`
      if (attempt < MAX_RETRIES) {
        await sleep(backoffMs(attempt))
        continue
      }
      throw new IntegrimHttpError(service, response.status, text.slice(0, 600))
    }

    return parseResponse(JSON.parse(text || '{}'))
  }

  throw createError({ statusCode: 502, statusMessage: `Integrim instavel apos varias tentativas (${lastDetail}).` })
}

const getPageCount = (result: IntegrimPagedResponse<IntegrimRecord>, pageSize: number) => {
  if (!result.data.length) return 0
  if (!result.hasNext) return 1
  const size = Math.max(result.data.length, pageSize, 1)
  const pageCount = Math.ceil(result.total / size)
  return Math.min(Math.max(pageCount, 1), MAX_PAGES_PER_QUERY)
}

// ---------------------------------------------------------------------------
// Cabecalhos (notas fiscais 55/65) por empresa + modelo + janela de data.
// ---------------------------------------------------------------------------

export const fetchDocumentosPage = async (
  config: IntegrimConfig,
  tokens: TokenManager,
  idempresa: number,
  modelo: string,
  startDate: string,
  endDate: string,
  page: number,
) => {
  // O Integrim nao aceita duas clausulas no mesmo campo (retorna vazio): usar BETWEEN.
  const clausulas: IntegrimClause[] = [
    { campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: idempresa },
    { campo: 'modelo', operadorlogico: 'AND', operador: 'IGUAL', valor: modelo },
    { campo: 'dtmovimento', operadorlogico: 'AND', operador: 'BETWEEN', valor: [startDate, endDate] },
  ]
  const ordenacoes: IntegrimOrder[] = [{ campo: 'idplanilha', direcao: 'ASC' }]
  return await postNotasServicePage(config, tokens, DOCUMENTOS_SERVICE, page, clausulas, ordenacoes)
}

export const createCompanyModelPlans = async (
  config: IntegrimConfig,
  tokens: TokenManager,
  companyIds: number[],
  modelos: string[],
  startDate: string,
  endDate: string,
): Promise<CompanyModelPlan[]> => {
  const plans: CompanyModelPlan[] = []

  for (const idempresa of companyIds) {
    for (const modelo of modelos) {
      const firstPage = await fetchDocumentosPage(config, tokens, idempresa, modelo, startDate, endDate, 1)
      if (!firstPage.data.length) continue

      plans.push({
        idempresa,
        modelo,
        firstPage,
        totalPages: getPageCount(firstPage, firstPage.data.length),
        totalRows: toInteger(firstPage.total) || firstPage.data.length,
      })
    }
  }

  return plans
}

// ---------------------------------------------------------------------------
// Itens de venda por empresa + janela de data (todas as vendas, incl. cupom/PDV).
// ---------------------------------------------------------------------------

export const fetchItensByDatePage = async (
  config: IntegrimConfig,
  tokens: TokenManager,
  idempresa: number,
  startDate: string,
  endDate: string,
  page: number,
) => {
  const clausulas: IntegrimClause[] = [
    { campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: idempresa },
    { campo: 'dtmovimento', operadorlogico: 'AND', operador: 'BETWEEN', valor: [startDate, endDate] },
  ]
  const ordenacoes: IntegrimOrder[] = [{ campo: 'idplanilha', direcao: 'ASC' }]
  return await postNotasServicePage(config, tokens, ITENS_SERVICE, page, clausulas, ordenacoes, ITENS_PAGE_SIZE)
}

export const getItensTotalPages = (firstPage: IntegrimPagedResponse<IntegrimRecord>) =>
  getPageCount(firstPage, ITENS_PAGE_SIZE)
