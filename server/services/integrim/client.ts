import type {
  NotaIntegrimLookupCandidate,
  NotaIntegrimLookupHints,
  NotaIntegrimLookupResponse,
  NotaMissingField,
  NotaProduto,
  NotaRetiradaDraft,
} from '../../../shared/types/NotasRetirada'
import { parseNfeKey } from '../../../shared/utils/nfe-chave'

const DEFAULT_COMPANY_IDS = [1, 2, 3, 4, 5, 6]
const DEFAULT_MODELO = '55'
// Busca sempre NF-e (55) e NFC-e (65) automaticamente.
const SUPPORTED_MODELOS = ['55', '65']
const REQUEST_TIMEOUT_MS = 20_000
const TOKEN_REFRESH_SAFETY_MS = 5 * 60 * 1000

type IntegrimConfig = {
  baseUrl: string
  username: string
  password: string
  clientId: string
  clientSecret: string
  modelos: string[]
  companyIds: number[]
}

type IntegrimClause = {
  campo: string
  operadorlogico: 'AND'
  operador: 'IGUAL' | 'MENOR' | 'MAIOR' | 'MENOR_IGUAL' | 'MAIOR_IGUAL' | 'LIKE' | 'BETWEEN' | 'IGUAL_NULL'
  valor: unknown
}

type IntegrimOrder = {
  campo: string
  direcao: 'ASC' | 'DESC'
}

type IntegrimDocument = {
  idempresa?: number
  idplanilha?: number
  nome?: string | null
  numnota?: number | string | null
  serienota?: string | null
  modelo?: string | null
  valcontabil?: number | string | null
  dtmovimento?: string | null
  cnpjcpf?: string | null
  chave?: string | null
}

type IntegrimItem = {
  idproduto?: number | string | null
  idsubproduto?: number | string | null
  descrproduto?: string | null
  qtdproduto?: number | string | null
  valunitbruto?: number | string | null
  valdescontopro?: number | string | null
  valtotliquido?: number | string | null
  unidade?: string | null
}

type IntegrimPagedResponse<T> = {
  data: T[]
  total: number
  hasNext: boolean
}

type LookupOptions = {
  numeroNota: string
  serieNota?: string | null
  idempresa?: number | null
  idplanilha?: number | null
}

type AccessTokenCache = {
  cacheKey: string
  token: string
  expiresAt: number
}

let accessTokenCache: AccessTokenCache | null = null

const normalizeBaseUrl = (value?: string) => String(value || '').trim().replace(/\/+$/, '')

const parseCompanyId = (value: unknown) => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) return null
  const integer = Math.trunc(parsed)
  return integer >= 1 && integer <= 6 ? integer : null
}

const parseCompanyIds = (value?: string) => {
  const ids = String(value || '')
    .split(',')
    .map(parseCompanyId)
    .filter((id): id is number => id !== null)

  return ids.length ? [...new Set(ids)] : DEFAULT_COMPANY_IDS
}

const getIntegrimConfig = (): IntegrimConfig => {
  const config = {
    baseUrl: normalizeBaseUrl(process.env.INTEGRIM_BASE_URL),
    username: String(process.env.INTEGRIM_USERNAME || '').trim(),
    password: String(process.env.INTEGRIM_PASSWORD || '').trim(),
    clientId: String(process.env.INTEGRIM_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.INTEGRIM_CLIENT_SECRET || '').trim(),
    modelos: SUPPORTED_MODELOS,
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

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return undefined

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

const toInteger = (value: unknown): number | undefined => {
  const parsed = toNumber(value)
  return parsed === undefined ? undefined : Math.trunc(parsed)
}

const digitsOnly = (value: unknown) => String(value || '').replace(/\D/g, '')

const normalizeSerieNota = (value: unknown) => {
  return String(value || '')
    .trim()
    .replace(/[^\w-]/g, '')
}

const normalizeDate = (value: unknown) => {
  const raw = String(value || '').trim()
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso?.[1]) return iso[1]
  return ''
}

const createHeaders = (token?: string) => {
  const headers = new Headers()
  headers.set('ngrok-skip-browser-warning', 'true')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

const parseResponseData = async <T>(response: Response): Promise<IntegrimPagedResponse<T>> => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Integrim retornou uma resposta inesperada.',
    })
  }

  const json = await response.json()
  if (Array.isArray(json)) {
    return {
      data: json as T[],
      total: json.length,
      hasNext: false,
    }
  }

  if (json && typeof json === 'object') {
    const data = Array.isArray(json.data)
      ? json.data
      : ('idempresa' in json || 'idplanilha' in json) ? [json] : []

    return {
      data: data as T[],
      total: Number(json.total ?? data.length) || data.length,
      hasNext: Boolean(json.hasNext),
    }
  }

  return { data: [], total: 0, hasNext: false }
}

const fetchIntegrim = async (url: string, init: RequestInit) => {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  }
  catch (error) {
    console.error('[integrim] request failed:', error instanceof Error ? error.message : 'unknown error')
    throw createError({
      statusCode: 502,
      statusMessage: 'Nao foi possivel conectar a Integrim.',
    })
  }
}

const getAccessToken = async (config: IntegrimConfig) => {
  const cacheKey = [
    config.baseUrl,
    config.username,
    config.clientId || '',
    config.clientSecret ? 'with-client-secret' : 'without-client-secret',
  ].join('|')

  if (
    accessTokenCache?.cacheKey === cacheKey
    && accessTokenCache.expiresAt > Date.now() + TOKEN_REFRESH_SAFETY_MS
  ) {
    return accessTokenCache.token
  }

  const body = new URLSearchParams()
  body.set('grant_type', 'password')
  body.set('username', config.username)
  body.set('password', config.password)
  body.set('client_id', config.clientId)
  body.set('client_secret', config.clientSecret)

  const response = await fetchIntegrim(`${config.baseUrl}/cisspoder-auth/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'ngrok-skip-browser-warning': 'true',
    },
    body,
  })

  if (!response.ok) {
    console.error('[integrim] auth failed:', response.status)
    throw createError({
      statusCode: 502,
      statusMessage: 'Nao foi possivel autenticar na Integrim.',
    })
  }

  const json = await response.json().catch(() => null)
  const token = String(json?.access_token || '').trim()
  if (!token) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Integrim nao retornou token de acesso.',
    })
  }

  const expiresInSeconds = toInteger(json?.expires_in) ?? 0
  accessTokenCache = {
    cacheKey,
    token,
    expiresAt: Date.now() + Math.max(60, expiresInSeconds) * 1000,
  }

  return token
}

const postServicePage = async <T>(
  config: IntegrimConfig,
  token: string,
  service: string,
  page: number,
  clausulas: IntegrimClause[],
  ordenacoes: IntegrimOrder[],
) => {
  const response = await fetchIntegrim(`${config.baseUrl}/cisspoder-service/${service}`, {
    method: 'POST',
    headers: createHeaders(token),
    body: JSON.stringify({
      page,
      clausulas,
      ordenacoes,
    }),
  })

  if (response.status === 401) {
    accessTokenCache = null
    throw createError({
      statusCode: 502,
      statusMessage: 'Sessao da Integrim expirou durante a consulta.',
    })
  }

  if (!response.ok) {
    console.error(`[integrim] ${service} failed:`, response.status)
    throw createError({
      statusCode: 502,
      statusMessage: 'Integrim nao conseguiu concluir a consulta.',
    })
  }

  return await parseResponseData<T>(response)
}

const postServiceAllPages = async <T>(
  config: IntegrimConfig,
  token: string,
  service: string,
  clausulas: IntegrimClause[],
  ordenacoes: IntegrimOrder[],
) => {
  const rows: T[] = []
  let page = 1
  let hasNext = true

  while (hasNext && page <= 10) {
    const result = await postServicePage<T>(config, token, service, page, clausulas, ordenacoes)
    rows.push(...result.data)
    hasNext = result.hasNext
    page += 1
  }

  return rows
}

const documentToCandidate = (documento: IntegrimDocument): NotaIntegrimLookupCandidate | null => {
  const idempresa = parseCompanyId(documento.idempresa)
  const idplanilha = toInteger(documento.idplanilha)
  const numeroNota = String(documento.numnota || '').trim()

  if (!idempresa || !idplanilha || !numeroNota) return null

  return {
    idempresa,
    idplanilha,
    numero_nota: numeroNota,
    serie_nota: String(documento.serienota || '').trim() || '1',
    modelo: String(documento.modelo || '').trim() || DEFAULT_MODELO,
    nome_cliente: String(documento.nome || '').trim(),
    documento_cliente: digitsOnly(documento.cnpjcpf),
    data_compra: normalizeDate(documento.dtmovimento),
    valor_total: toNumber(documento.valcontabil) ?? null,
  }
}

const normalizeProduto = (item: IntegrimItem): NotaProduto | null => {
  const nome = String(item.descrproduto || '').trim()
  if (!nome) return null

  const quantidade = toNumber(item.qtdproduto)
  const valorUnitario = toNumber(item.valunitbruto)
  const desconto = toNumber(item.valdescontopro)
  const valorLiquido = toNumber(item.valtotliquido)
  const idProdutoEstoque = toInteger(item.idproduto)
  const valorBruto = quantidade !== undefined && valorUnitario !== undefined
    ? quantidade * valorUnitario
    : undefined

  return {
    nome,
    ...(quantidade !== undefined ? { quantidade } : {}),
    ...(valorUnitario !== undefined ? { valor_unitario: valorUnitario } : {}),
    ...(valorBruto !== undefined ? { valor_total: Number(valorBruto.toFixed(2)) } : {}),
    ...(valorLiquido !== undefined ? { valor_liquido: valorLiquido } : {}),
    ...(desconto !== undefined ? { desconto } : {}),
    ...(idProdutoEstoque !== undefined ? { id_produto_estoque: idProdutoEstoque } : {}),
    ...(item.idsubproduto ? { idsubproduto: toInteger(item.idsubproduto) ?? String(item.idsubproduto) } : {}),
    ...(item.unidade ? { unidade: String(item.unidade).trim() } : {}),
    ...(idProdutoEstoque ? { confidence: 1 } : {}),
  }
}

const buildDraft = (
  documento: IntegrimDocument,
  candidate: NotaIntegrimLookupCandidate,
  itens: IntegrimItem[],
): NotaRetiradaDraft => {
  const produtos = itens
    .map(normalizeProduto)
    .filter((item): item is NotaProduto => item !== null)

  const descontoTotal = produtos.reduce((total, produto) => total + Math.max(0, toNumber(produto.desconto) || 0), 0)
  const brutoProdutos = produtos.reduce((total, produto) => total + Math.max(0, toNumber(produto.valor_total) || 0), 0)
  const valorContabil = toNumber(documento.valcontabil) ?? candidate.valor_total ?? 0
  const valorTotal = brutoProdutos || (valorContabil + descontoTotal)
  const chave = digitsOnly(documento.chave)

  return {
    idempresa: candidate.idempresa,
    nome_cliente: candidate.nome_cliente,
    telefone_cliente: '',
    documento_cliente: candidate.documento_cliente,
    numero_nota: candidate.numero_nota,
    serie_nota: candidate.serie_nota,
    chave_nfe: chave,
    data_compra: candidate.data_compra,
    observacoes: '',
    produtos,
    valor_total: Number(valorTotal.toFixed(2)),
    desconto_total: Number(descontoTotal.toFixed(2)),
    status_retirada: 'pendente',
  }
}

const findDocumentsByCompany = async (
  config: IntegrimConfig,
  token: string,
  idempresa: number,
  numeroNota: string,
  serieNota?: string | null,
) => {
  const documents: IntegrimDocument[] = []

  for (const modelo of config.modelos) {
    const clausulas: IntegrimClause[] = [
      { campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: idempresa },
      { campo: 'numnota', operadorlogico: 'AND', operador: 'IGUAL', valor: Number(numeroNota) },
      { campo: 'modelo', operadorlogico: 'AND', operador: 'IGUAL', valor: modelo },
    ]

    if (serieNota) {
      clausulas.push({ campo: 'serienota', operadorlogico: 'AND', operador: 'IGUAL', valor: serieNota })
    }

    const found = await postServiceAllPages<IntegrimDocument>(
      config,
      token,
      'documentos_fiscais_saida',
      clausulas,
      [{ campo: 'dtmovimento', direcao: 'DESC' }],
    )

    if (found.length) {
      documents.push(...found)
      break
    }
  }

  return documents
}

const findItems = async (
  config: IntegrimConfig,
  token: string,
  idempresa: number,
  idplanilha: number,
) => {
  return await postServiceAllPages<IntegrimItem>(
    config,
    token,
    'itens_documentos_fiscais_saida',
    [
      { campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: idempresa },
      { campo: 'idplanilha', operadorlogico: 'AND', operador: 'IGUAL', valor: idplanilha },
    ],
    [{ campo: 'numsequencia', direcao: 'ASC' }],
  )
}

// Localiza a venda pelo CNPJ/CPF do destinatario + dia da emissao. Usado como
// fallback quando a NF-e referencia um cupom (NOTA DE ECF) e a busca pelo numero
// da NF-e nao encontra o documento (que esta gravado como NFC-e).
const findDocumentsByCnpjData = async (
  config: IntegrimConfig,
  token: string,
  idempresa: number,
  documentoCliente: string,
  dataEmissao: string,
) => {
  return await postServiceAllPages<IntegrimDocument>(
    config,
    token,
    'documentos_fiscais_saida',
    [
      { campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: idempresa },
      { campo: 'cnpjcpf', operadorlogico: 'AND', operador: 'IGUAL', valor: documentoCliente },
      {
        campo: 'dtmovimento',
        operadorlogico: 'AND',
        operador: 'BETWEEN',
        valor: [`${dataEmissao} 00:00:00.000000`, `${dataEmissao} 23:59:59.999999`],
      },
    ],
    [{ campo: 'dtmovimento', direcao: 'DESC' }],
  )
}

const collectDocumentsByNumero = async (
  config: IntegrimConfig,
  token: string,
  companyIds: number[],
  numeroNota: string,
  serieNota?: string | null,
  stopOnFirstCompany = true,
) => {
  const documents: IntegrimDocument[] = []
  for (const idempresa of companyIds) {
    const found = await findDocumentsByCompany(config, token, idempresa, numeroNota, serieNota)
    documents.push(...found)
    if (stopOnFirstCompany && found.length) break
  }
  return documents
}

type DraftOverrides = {
  numero_nota?: string
  serie_nota?: string
  chave_nfe?: string
  observacaoExtra?: string
}

type BuildResponseOptions = {
  forcedCompanyId?: number | null
  forcedPlanilhaId?: number | null
  notFoundMessage: string
  overrides?: DraftOverrides
}

const applyDraftOverrides = (draft: NotaRetiradaDraft, overrides?: DraftOverrides): NotaRetiradaDraft => {
  if (!overrides) return draft

  const numeroNota = String(overrides.numero_nota || '').trim()
  const serieNota = String(overrides.serie_nota || '').trim()
  const chaveNfe = digitsOnly(overrides.chave_nfe)
  const observacao = String(overrides.observacaoExtra || '').trim()

  return {
    ...draft,
    ...(numeroNota ? { numero_nota: numeroNota } : {}),
    ...(serieNota ? { serie_nota: serieNota } : {}),
    ...(chaveNfe.length === 44 ? { chave_nfe: chaveNfe } : {}),
    ...(observacao
      ? { observacoes: [draft.observacoes, observacao].filter(Boolean).join(' ').trim() }
      : {}),
  }
}

const buildLookupResponse = async (
  config: IntegrimConfig,
  token: string,
  documents: IntegrimDocument[],
  options: BuildResponseOptions,
): Promise<NotaIntegrimLookupResponse> => {
  const { forcedCompanyId, forcedPlanilhaId, notFoundMessage } = options

  const candidates = documents
    .map(documentToCandidate)
    .filter((candidate): candidate is NotaIntegrimLookupCandidate => candidate !== null)

  if (!candidates.length) {
    return {
      success: true,
      found: false,
      message: notFoundMessage,
      candidates: [],
    }
  }

  const selected = forcedPlanilhaId
    ? candidates.find(candidate => candidate.idplanilha === forcedPlanilhaId && (!forcedCompanyId || candidate.idempresa === forcedCompanyId))
    : candidates.length === 1 ? candidates[0] : null

  if (!selected) {
    return {
      success: true,
      found: true,
      message: 'Mais de uma nota foi encontrada. Escolha a nota correta para preencher o cadastro.',
      candidates,
    }
  }

  const documento = documents.find(item =>
    parseCompanyId(item.idempresa) === selected.idempresa
    && toInteger(item.idplanilha) === selected.idplanilha,
  )

  if (!documento) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Integrim retornou uma nota inconsistente.',
    })
  }

  const itens = await findItems(config, token, selected.idempresa, selected.idplanilha)
  const draft = applyDraftOverrides(buildDraft(documento, selected, itens), options.overrides)
  const missingFields = [
    !draft.telefone_cliente ? 'telefone_cliente' : null,
    !draft.chave_nfe ? 'chave_nfe' : null,
    !draft.data_compra ? 'data_compra' : null,
    !draft.produtos.length ? 'produtos' : null,
  ].filter((field): field is NotaMissingField => field !== null)

  return {
    success: true,
    found: true,
    message: `Nota encontrada na empresa ${selected.idempresa}.`,
    draft,
    candidate: selected,
    candidates: [selected],
    missingFields,
  }
}

export const lookupNotaIntegrim = async (options: LookupOptions): Promise<NotaIntegrimLookupResponse> => {
  const numeroNota = String(options.numeroNota || '').trim()
  const serieNota = normalizeSerieNota(options.serieNota)
  const forcedCompanyId = options.idempresa === null || options.idempresa === undefined
    ? null
    : parseCompanyId(options.idempresa)
  const forcedPlanilhaId = options.idplanilha === null || options.idplanilha === undefined
    ? null
    : toInteger(options.idplanilha)

  if (!numeroNota || !/^\d+$/.test(numeroNota)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe o numero da nota para buscar.',
    })
  }

  if (options.idempresa !== null && options.idempresa !== undefined && !forcedCompanyId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da empresa invalido. Use um numero entre 1 e 6.',
    })
  }

  const config = getIntegrimConfig()
  const token = await getAccessToken(config)
  const companyIds = forcedCompanyId ? [forcedCompanyId] : config.companyIds
  const documents = await collectDocumentsByNumero(config, token, companyIds, numeroNota, serieNota, !forcedCompanyId)

  return buildLookupResponse(config, token, documents, {
    forcedCompanyId,
    forcedPlanilhaId,
    notFoundMessage: forcedCompanyId
      ? `Nota nao encontrada na Integrim para a empresa ${forcedCompanyId}. O documento pode ainda nao ter sido disponibilizado; confira o numero ou tente todas as empresas.`
      : 'Nota nao encontrada na Integrim nas empresas 1 a 6. O documento pode ainda nao ter sido disponibilizado pela integracao.',
  })
}

// Busca a venda a partir dos dados lidos da foto, tratando NF-e complementares de
// cupom ("NOTA DE ECF"): se o numero da NF-e nao for encontrado, usamos a chave do
// cupom referenciado e, por ultimo, o CNPJ/CPF do destinatario + dia da emissao.
export const lookupNotaIntegrimFromImageHints = async (
  hints: NotaIntegrimLookupHints,
): Promise<NotaIntegrimLookupResponse> => {
  const numeroNota = String(hints.numero_nota || '').trim()
  const serieNota = normalizeSerieNota(hints.serie_nota)
  const chaveNfe = digitsOnly(hints.chave_nfe)

  if (!numeroNota || !/^\d+$/.test(numeroNota)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe o numero da nota para buscar.',
    })
  }

  const config = getIntegrimConfig()
  const token = await getAccessToken(config)
  const companyIds = config.companyIds

  // 1) Busca direta pelo numero da nota lido.
  let documents = await collectDocumentsByNumero(config, token, companyIds, numeroNota, serieNota)
  let cupomRef: ReturnType<typeof parseNfeKey> = null
  let viaFallback = false

  // 2) NF-e que referencia um cupom (NOTA DE ECF): busca pela NFC-e referenciada.
  if (!documents.length && hints.chave_referenciada) {
    cupomRef = parseNfeKey(hints.chave_referenciada)
    if (cupomRef?.numero_nota) {
      documents = await collectDocumentsByNumero(config, token, companyIds, cupomRef.numero_nota, cupomRef.serie_nota)
      if (!documents.length) cupomRef = null
    }
    else {
      cupomRef = null
    }
  }

  // 3) Fallback robusto: CNPJ/CPF do destinatario + dia da emissao.
  const documentoCliente = digitsOnly(hints.documento_cliente)
  const dataEmissao = String(hints.data_emissao || '').trim()
  if (!documents.length && documentoCliente && /^\d{4}-\d{2}-\d{2}$/.test(dataEmissao)) {
    for (const idempresa of companyIds) {
      const found = await findDocumentsByCnpjData(config, token, idempresa, documentoCliente, dataEmissao)
      documents.push(...found)
      if (found.length) {
        viaFallback = true
        break
      }
    }
  }

  const overrides: DraftOverrides = {
    numero_nota: numeroNota,
    serie_nota: serieNota,
    ...(chaveNfe.length === 44 ? { chave_nfe: chaveNfe } : {}),
  }

  if (cupomRef) {
    overrides.observacaoExtra = `Dados fiscais obtidos do cupom NFC-e ${cupomRef.numero_nota}/${cupomRef.serie_nota}; NF-e ${numeroNota} e complementar (NOTA DE ECF).`
  }
  else if (viaFallback) {
    overrides.observacaoExtra = `Dados fiscais localizados pelo cupom da venda (NF-e ${numeroNota} complementar). Confira antes de salvar.`
  }

  return buildLookupResponse(config, token, documents, {
    notFoundMessage: 'Nota nao encontrada na Integrim nas empresas 1 a 6. O documento pode ainda nao ter sido disponibilizado pela integracao.',
    overrides,
  })
}
