import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import {
  DEFAULT_OPENAI_MODEL,
  isOpenAIModelSupported,
} from '../../../../shared/constants/OpenAIModels'
import type {
  IntegrimCompraOportunidadeActionResponse,
  IntegrimCompraOportunidadeStatus,
  IntegrimCompraTaskRunResponse,
} from '../../../../shared/types/IntegrimNotas'
import { getOpenAIClient } from '../../openai/client'
import { getNextCompraTaskRunAt, taskNextRunIsDue } from './opportunity-task-schedule'
import { createAdminClient } from '../sync/repository'

type AdminClient = ReturnType<typeof createAdminClient>

type ProdutoContext = {
  idempresa: number
  idproduto: number
  idsubproduto: number
  descricao: string | null
  saldo_disponivel: number
  custo_unit: number | null
  qtd_periodo: number
  faturamento_periodo: number
  margem_periodo: number
  giro_diario: number
  dias_cobertura: number | null
  sugestao_compra: number
  score_valor: number
  ai_oportunidade_id?: string | null
}

type ProductSelectionMode =
  | 'top_score'
  | 'top_revenue'
  | 'top_margin'
  | 'top_quantity'
  | 'random'
  | 'specific'

type ProductSelectionConfig = {
  mode: ProductSelectionMode
  limit: number
  specificProducts: string[]
}

type AiSource = {
  title: string
  url: string
  source_date: string | null
  resumo: string
}

type AiEvent = {
  tipo: 'clima' | 'cidade' | 'esporte' | 'feriado' | 'obra' | 'tendencia' | 'fornecedor'
  titulo: string
  resumo: string
  data_inicio: string | null
  data_fim: string | null
  regiao: string | null
  confidence: number
  fontes: AiSource[]
  payload: Record<string, unknown>
}

type AiOpportunity = {
  event_index: number
  idempresa: number
  idproduto: number
  idsubproduto: number
  compra_extra: number
  confidence: number
  motivo: string
  evidencias: Array<Record<string, unknown>>
  contra_argumento: string | null
  valid_until: string | null
  payload: Record<string, unknown>
}

type AiOutput = {
  events: AiEvent[]
  opportunities: AiOpportunity[]
}

class NoDueCompraTaskError extends Error {}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['events', 'opportunities'],
  properties: {
    events: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tipo', 'titulo', 'resumo', 'data_inicio', 'data_fim', 'regiao', 'confidence', 'fontes', 'payload'],
        properties: {
          tipo: { type: 'string', enum: ['clima', 'cidade', 'esporte', 'feriado', 'obra', 'tendencia', 'fornecedor'] },
          titulo: { type: 'string' },
          resumo: { type: 'string' },
          data_inicio: { type: ['string', 'null'] },
          data_fim: { type: ['string', 'null'] },
          regiao: { type: ['string', 'null'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          fontes: {
            type: 'array',
            minItems: 1,
            maxItems: 6,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'url', 'source_date', 'resumo'],
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                source_date: { type: ['string', 'null'] },
                resumo: { type: 'string' },
              },
            },
          },
          payload: { type: 'object', additionalProperties: true },
        },
      },
    },
    opportunities: {
      type: 'array',
      maxItems: 50,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'event_index',
          'idempresa',
          'idproduto',
          'idsubproduto',
          'compra_extra',
          'confidence',
          'motivo',
          'evidencias',
          'contra_argumento',
          'valid_until',
          'payload',
        ],
        properties: {
          event_index: { type: 'integer', minimum: 0 },
          idempresa: { type: 'integer' },
          idproduto: { type: 'integer' },
          idsubproduto: { type: 'integer' },
          compra_extra: { type: 'number', minimum: 0 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          motivo: { type: 'string' },
          evidencias: { type: 'array', items: { type: 'object', additionalProperties: true } },
          contra_argumento: { type: ['string', 'null'] },
          valid_until: { type: ['string', 'null'] },
          payload: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
}

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const numberValueWithFallback = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const objectValue = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

const nullableNumber = (value: unknown) => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toIsoDateOrNull = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  return Number.isFinite(Date.parse(`${raw}T00:00:00Z`)) ? raw : null
}

const toIsoTimestampOrNull = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

const hashPayload = (payload: unknown) =>
  createHash('sha256').update(JSON.stringify(payload)).digest('hex')

const productKey = (input: Pick<ProdutoContext | AiOpportunity, 'idempresa' | 'idproduto' | 'idsubproduto'>) =>
  `${input.idempresa}:${input.idproduto}:${input.idsubproduto}`

const productSelectionLabels: Record<ProductSelectionMode, string> = {
  top_score: 'maior score de compra',
  top_revenue: 'maior faturamento no periodo',
  top_margin: 'maior margem no periodo',
  top_quantity: 'maior quantidade vendida no periodo',
  random: 'amostra aleatoria de produtos',
  specific: 'produtos especificos definidos na task',
}

const extractOutputText = (response: any) => {
  if (typeof response?.output_text === 'string') return response.output_text
  const chunks: string[] = []
  for (const item of response?.output || []) {
    if (item?.type !== 'message') continue
    for (const content of item.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text)
    }
  }
  return chunks.join('\n').trim()
}

const parseAiOutput = (text: string): AiOutput => {
  const parsed = JSON.parse(text || '{}') as Partial<AiOutput>
  return {
    events: Array.isArray(parsed.events) ? parsed.events as AiEvent[] : [],
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities as AiOpportunity[] : [],
  }
}

const resolveOpportunityModel = (params: Record<string, unknown>) => {
  const taskModel = String(params.model || '').trim()
  if (taskModel && isOpenAIModelSupported(taskModel)) return taskModel
  return String(process.env.OPENAI_COMPRA_OPPORTUNITY_MODEL || DEFAULT_OPENAI_MODEL)
}

const resolveLocationText = (params: Record<string, unknown>) => {
  const city = String(params.city || '').trim()
  const state = String(params.state || '').trim().toUpperCase()
  const region = String(params.region || '').trim()
  const cityState = [city, state].filter(Boolean).join(' - ')
  return cityState || region || 'Brasil'
}

const resolveProductSelection = (params: Record<string, unknown>): ProductSelectionConfig => {
  const selection = objectValue(params.product_selection)
  const modeInput = String(selection.mode || 'top_score') as ProductSelectionMode
  const mode: ProductSelectionMode = productSelectionLabels[modeInput] ? modeInput : 'top_score'
  const limit = Math.min(1000, Math.max(1, Math.trunc(numberValueWithFallback(selection.limit, 50))))
  const specificProducts = Array.isArray(selection.specific_products)
    ? selection.specific_products.map(item => String(item || '').trim()).filter(Boolean).slice(0, 100)
    : []

  return { mode, limit, specificProducts }
}

const fetchTask = async (client: AdminClient, taskId?: string | null) => {
  let request = (client as any)
    .from('ai_compra_tasks')
    .select('*')
    .eq('task_type', 'opportunity_research')
    .eq('enabled', true)
    .is('locked_at', null)

  if (taskId) {
    request = request.eq('id', taskId).limit(1)
  }
  else {
    request = request
      .order('next_run_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(20)
  }

  const { data, error } = await request
  if (error) throw error
  const tasks = (data || []) as Array<Record<string, unknown>>
  const task = taskId
    ? tasks[0]
    : tasks.find(item => taskNextRunIsDue(item.next_run_at))

  if (!task) {
    if (!taskId) throw new NoDueCompraTaskError('Nenhuma task de oportunidades IA vencida para executar agora.')
    throw createError({
      statusCode: 404,
      statusMessage: 'Nenhuma task de oportunidades IA ativa foi encontrada.',
    })
  }
  return task
}

const startRun = async (client: AdminClient, taskId: string) => {
  const { data, error } = await (client as any)
    .from('ai_compra_task_runs')
    .insert({ task_id: taskId, status: 'running' })
    .select('id')
    .single()
  if (error) throw error

  await (client as any)
    .from('ai_compra_tasks')
    .update({ locked_at: new Date().toISOString(), last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', taskId)

  return String(data.id)
}

const finishRun = async (
  client: AdminClient,
  taskId: string,
  runId: string,
  input: {
    status: 'success' | 'failed'
    sourcesCount?: number
    opportunitiesCount?: number
    errorMessage?: string | null
    usage?: Record<string, unknown>
    resultSummary?: Record<string, unknown>
  },
) => {
  const now = new Date().toISOString()
  await (client as any)
    .from('ai_compra_task_runs')
    .update({
      status: input.status,
      finished_at: now,
      sources_count: input.sourcesCount || 0,
      opportunities_count: input.opportunitiesCount || 0,
      error_message: input.errorMessage || null,
      usage: input.usage || {},
      result_summary: input.resultSummary || {},
    })
    .eq('id', runId)

  const taskUpdate: Record<string, unknown> = {
    locked_at: null,
    updated_at: now,
  }
  if (input.status === 'success') taskUpdate.last_success_at = now

  const { data: task } = await (client as any)
    .from('ai_compra_tasks')
    .select('params,timezone')
    .eq('id', taskId)
    .maybeSingle()
  if (task) {
    taskUpdate.next_run_at = getNextCompraTaskRunAt(
      (task as Record<string, unknown>).params,
      (task as Record<string, unknown>).timezone,
      new Date(now),
    )
  }

  await (client as any)
    .from('ai_compra_tasks')
    .update(taskUpdate)
    .eq('id', taskId)
}

const mapProdutoContextRows = (rows: Array<Record<string, unknown>>): ProdutoContext[] => {
  return rows.map(row => ({
    idempresa: numberValue(row.idempresa),
    idproduto: numberValue(row.idproduto),
    idsubproduto: numberValue(row.idsubproduto),
    descricao: row.descricao ? String(row.descricao) : null,
    saldo_disponivel: numberValue(row.saldo_disponivel),
    custo_unit: nullableNumber(row.custo_unit),
    qtd_periodo: numberValue(row.qtd_periodo),
    faturamento_periodo: numberValue(row.faturamento_periodo),
    margem_periodo: numberValue(row.margem_periodo),
    giro_diario: numberValue(row.giro_diario),
    dias_cobertura: nullableNumber(row.dias_cobertura),
    sugestao_compra: numberValue(row.sugestao_compra),
    score_valor: numberValue(row.score_valor),
    ai_oportunidade_id: row.ai_oportunidade_id ? String(row.ai_oportunidade_id) : null,
  }))
}

const dedupeProducts = (products: ProdutoContext[]) => {
  const byKey = new Map<string, ProdutoContext>()
  for (const product of products) {
    if (!byKey.has(productKey(product))) byKey.set(productKey(product), product)
  }
  return [...byKey.values()]
}

const shuffleProducts = (products: ProdutoContext[]) => {
  const next = [...products]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    const swap = next[swapIndex]
    if (!current || !swap) continue
    next[index] = swap
    next[swapIndex] = current
  }
  return next
}

const productSortForSelection = (mode: ProductSelectionMode) => {
  if (mode === 'top_revenue') return 'faturamento_periodo'
  if (mode === 'top_margin') return 'margem_periodo'
  if (mode === 'top_quantity') return 'qtd_periodo'
  return 'score_valor'
}

const fetchProductContextPage = async (
  client: AdminClient,
  input: {
    sort: string
    page: number
    pageSize: number
    search?: string | null
    idempresa?: number | null
    dateStart?: string | null
    dateEnd?: string | null
    coverageDays?: number | null
  },
) => {
  const { data, error } = await (client as any)
    .rpc('integrim_produto_valor_periodo', {
      p_date_start: input.dateStart || null,
      p_date_end: input.dateEnd || null,
      p_coverage_days: input.coverageDays ?? 45,
      p_idempresa: input.idempresa || null,
      p_search: input.search || null,
      p_sort: input.sort,
      p_page: input.page,
      p_page_size: input.pageSize,
      p_compare_previous: true,
      p_oportunidade_filter: 'all',
    })

  if (error) throw error
  return mapProdutoContextRows((data || []) as Array<Record<string, unknown>>)
}

const fetchSpecificProductContext = async (
  client: AdminClient,
  selection: ProductSelectionConfig,
  idempresa: number | null,
  dateStart: string | null,
  dateEnd: string | null,
  coverageDays: number | null,
) => {
  const products: ProdutoContext[] = []
  for (const term of selection.specificProducts) {
    if (products.length >= selection.limit) break
    const matches = await fetchProductContextPage(client, {
      sort: 'score_valor',
      page: 1,
      pageSize: Math.min(20, selection.limit),
      search: term,
      idempresa,
      dateStart,
      dateEnd,
      coverageDays,
    })
    if (matches.length) {
      const pairMatch = term.match(/^([0-9]+)\/([0-9]+)$/)
      if (pairMatch) {
        const idproduto = Number(pairMatch[1])
        const idsubproduto = Number(pairMatch[2])
        const exactMatches = matches.filter(p => Number(p.idproduto) === idproduto && Number(p.idsubproduto) === idsubproduto)
        products.push(...exactMatches)
      } else {
        products.push(...matches)
      }
    }
  }
  return dedupeProducts(products).slice(0, selection.limit)
}

const fetchProductContext = async (
  client: AdminClient,
  params: Record<string, unknown>,
): Promise<ProdutoContext[]> => {
  const selection = resolveProductSelection(params)
  const idempresa = params.idempresa ? Number(params.idempresa) : null
  const dateStart = params.history_date_start ? String(params.history_date_start) : null
  const dateEnd = params.history_date_end ? String(params.history_date_end) : null
  const coverageDays = params.coverage_days ? Number(params.coverage_days) : null

  if (selection.mode === 'specific') {
    return fetchSpecificProductContext(client, selection, idempresa, dateStart, dateEnd, coverageDays)
  }

  const sort = productSortForSelection(selection.mode)
  const targetLimit = selection.mode === 'random'
    ? Math.min(1000, Math.max(selection.limit, selection.limit * 3, 200))
    : selection.limit
  const products: ProdutoContext[] = []
  let page = 1

  while (products.length < targetLimit) {
    const pageSize = Math.min(200, targetLimit - products.length)
    const pageProducts = await fetchProductContextPage(client, {
      sort,
      page,
      pageSize,
      idempresa,
      dateStart,
      dateEnd,
      coverageDays,
    })
    if (!pageProducts.length) break
    products.push(...pageProducts)
    if (pageProducts.length < pageSize) break
    page += 1
  }

  const deduped = dedupeProducts(products)
  return selection.mode === 'random'
    ? shuffleProducts(deduped).slice(0, selection.limit)
    : deduped.slice(0, selection.limit)
}

export const DEFAULT_PROMPT_TEMPLATE = `Voce pesquisa oportunidades externas de compra para uma loja de materiais/construcao/zinco.
Procure sinais publicos atuais destes tipos: {sources}.
Use apenas produtos presentes na lista enviada. Nao invente produto, cliente, venda ou estoque.
Crie oportunidade somente se houver fonte publica e relacao plausivel com demanda do produto.
Salve contra-argumento real: por que a compra extra pode estar errada.
Nao recomende compra automatica. A resposta alimenta uma fila para aprovacao humana.
Base geografica da pesquisa: {location}.
Produtos enviados: {products_count}. Criterio de selecao: {selection_mode} ({products_limit}).`

const renderPromptTemplate = (template: string, vars: Record<string, string | number>) => {
  let result = template
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(val))
  }
  return result
}

const buildPrompt = (task: Record<string, unknown>, produtos: ProdutoContext[]) => {
  const params = objectValue(task.params)
  const location = resolveLocationText(params)
  const selection = resolveProductSelection(params)
  const sources = Array.isArray(params.sources) && params.sources.length
    ? params.sources.map(source => String(source)).join(', ')
    : 'clima, cidade, esporte, feriado, obra, tendencia, fornecedor'

  const template = params.custom_prompt ? String(params.custom_prompt) : DEFAULT_PROMPT_TEMPLATE
  const instructionPart = renderPromptTemplate(template, {
    sources,
    location,
    products_count: produtos.length,
    selection_mode: productSelectionLabels[selection.mode],
    products_limit: selection.limit,
  })

  return [
    instructionPart,
    '',
    'Produtos sanitizados:',
    JSON.stringify(produtos.map(p => ({
      idempresa: p.idempresa,
      idproduto: p.idproduto,
      idsubproduto: p.idsubproduto,
      descricao: p.descricao,
      saldo_disponivel: p.saldo_disponivel,
      custo_unit: p.custo_unit,
      qtd_90d_base: p.qtd_periodo,
      faturamento_90d_base: p.faturamento_periodo,
      margem_90d_base: p.margem_periodo,
      giro_diario: p.giro_diario,
      dias_cobertura: p.dias_cobertura,
      sugestao_compra_calculada: p.sugestao_compra,
      score_valor: p.score_valor,
    }))),
  ].join('\n')
}

const saveEvent = async (client: AdminClient, runId: string, event: AiEvent) => {
  const cleanSources = Array.isArray(event.fontes)
    ? event.fontes.filter(source => source.url && source.title)
    : []
  if (!cleanSources.length) return null

  const payload = {
    tipo: event.tipo,
    titulo: String(event.titulo || '').slice(0, 240),
    data_inicio: toIsoDateOrNull(event.data_inicio),
    data_fim: toIsoDateOrNull(event.data_fim),
    regiao: event.regiao ? String(event.regiao).slice(0, 120) : null,
    fontes: cleanSources,
  }
  const dedupHash = hashPayload(payload)

  const { data: existing, error: existingError } = await (client as any)
    .from('compra_eventos_contexto')
    .select('id')
    .eq('dedup_hash', dedupHash)
    .maybeSingle()
  if (existingError) throw existingError

  const values = {
    task_run_id: runId,
    origem: 'ia',
    tipo: event.tipo,
    titulo: String(event.titulo || '').slice(0, 240),
    resumo: String(event.resumo || '').slice(0, 1200),
    data_inicio: payload.data_inicio,
    data_fim: payload.data_fim,
    regiao: payload.regiao,
    fontes: cleanSources,
    confidence: Math.min(1, Math.max(0, numberValue(event.confidence))),
    dedup_hash: dedupHash,
    payload: event.payload || {},
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await (client as any)
      .from('compra_eventos_contexto')
      .update(values)
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error) throw error
    return String(data.id)
  }

  const { data, error } = await (client as any)
    .from('compra_eventos_contexto')
    .insert(values)
    .select('id')
    .single()
  if (error) throw error
  return String(data.id)
}

const saveOpportunity = async (
  client: AdminClient,
  runId: string,
  eventId: string | null,
  opportunity: AiOpportunity,
) => {
  const { data: existing, error: existingError } = await (client as any)
    .from('compra_oportunidades_ia')
    .select('id')
    .eq('evento_id', eventId)
    .eq('idempresa', opportunity.idempresa)
    .eq('idproduto', opportunity.idproduto)
    .eq('idsubproduto', opportunity.idsubproduto)
    .in('status', ['nova', 'aceita'])
    .maybeSingle()
  if (existingError) throw existingError

  const values = {
    task_run_id: runId,
    evento_id: eventId,
    idempresa: opportunity.idempresa,
    idproduto: opportunity.idproduto,
    idsubproduto: opportunity.idsubproduto,
    compra_extra: Number(Math.max(0, opportunity.compra_extra).toFixed(3)),
    confidence: Math.min(1, Math.max(0, numberValue(opportunity.confidence))),
    motivo: String(opportunity.motivo || '').slice(0, 1200),
    evidencias: Array.isArray(opportunity.evidencias) ? opportunity.evidencias : [],
    contra_argumento: opportunity.contra_argumento ? String(opportunity.contra_argumento).slice(0, 1200) : null,
    valid_until: toIsoTimestampOrNull(opportunity.valid_until),
    payload: opportunity.payload || {},
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await (client as any)
      .from('compra_oportunidades_ia')
      .update(values)
      .eq('id', existing.id)
    if (error) throw error
    return String(existing.id)
  }

  const { data, error } = await (client as any)
    .from('compra_oportunidades_ia')
    .insert(values)
    .select('id')
    .single()
  if (error) throw error
  return String(data.id)
}

export const runCompraOpportunityTask = async (
  event: H3Event,
  options: { taskId?: string | null } = {},
): Promise<IntegrimCompraTaskRunResponse> => {
  const adminClient = createAdminClient()
  const task = await fetchTask(adminClient, options.taskId).catch((error) => {
    if (error instanceof NoDueCompraTaskError) return null
    throw error
  })

  if (!task) {
    return {
      success: true,
      task_id: null,
      run_id: null,
      status: 'skipped',
      sources_count: 0,
      opportunities_count: 0,
      error_message: null,
    }
  }

  const taskId = String(task.id)

  // Fase 4 - gating: nao deixa a IA analisar um periodo sem dados diarios reais
  // (fora dos presets que caem no fallback), evitando recomendacoes sobre zeros.
  const guardParams = (task.params && typeof task.params === 'object' ? task.params : {}) as Record<string, unknown>
  const guardStart = guardParams.history_date_start ? String(guardParams.history_date_start) : null
  const guardEnd = guardParams.history_date_end ? String(guardParams.history_date_end) : null
  const guardEmpresa = guardParams.idempresa ? Number(guardParams.idempresa) : null
  const { data: coverageData } = await (adminClient as any).rpc('integrim_venda_dia_coverage', {
    p_idempresa: guardEmpresa,
    p_date_start: guardStart,
    p_date_end: guardEnd,
  })
  const coverageRow = (Array.isArray(coverageData) ? coverageData[0] : coverageData) as Record<string, unknown> | null
  if (coverageRow && coverageRow.periodo_coberto === false) {
    return {
      success: true,
      task_id: taskId,
      run_id: null,
      status: 'skipped',
      sources_count: 0,
      opportunities_count: 0,
      error_message: 'Periodo historico sem dados diarios. Rode a sincronizacao / backfill de vendas antes de pesquisar oportunidades de IA neste intervalo.',
    }
  }

  const runId = await startRun(adminClient, taskId)

  try {
    const params = (task.params && typeof task.params === 'object' ? task.params : {}) as Record<string, unknown>
    const produtos = await fetchProductContext(adminClient, params)

    if (!produtos.length) {
      await finishRun(adminClient, taskId, runId, {
        status: 'success',
        sourcesCount: 0,
        opportunitiesCount: 0,
        resultSummary: {
          progress: 100,
          processed_batches: 0,
          total_batches: 0,
          message: 'Nenhum produto selecionado para analise.',
        },
      })
      return {
        success: true,
        task_id: taskId,
        run_id: runId,
        status: 'success',
        sources_count: 0,
        opportunities_count: 0,
      }
    }

    const productKeys = new Set(produtos.map(productKey))
    const minConfidence = Math.min(1, Math.max(0, numberValue(params.min_confidence || 0.62)))
    const maxOpportunities = Math.min(50, Math.max(1, Math.trunc(numberValue(params.max_opportunities || 20))))
    const model = resolveOpportunityModel(params)

    // Loteamento / Batching setup
    const batchSizeInput = numberValue(params.products_per_ai_call)
    const batchSize = batchSizeInput > 0 ? Math.min(produtos.length, batchSizeInput) : produtos.length

    const chunks: ProdutoContext[][] = []
    for (let i = 0; i < produtos.length; i += batchSize) {
      chunks.push(produtos.slice(i, i + batchSize))
    }

    const client = getOpenAIClient(event)
    let sourcesCount = 0
    let opportunitiesCount = 0
    const totalUsage = {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    }

    for (let batchIndex = 0; batchIndex < chunks.length; batchIndex++) {
      const chunk = chunks[batchIndex]

      // Gravacao do progresso no banco de dados
      const progressPercent = Math.round((batchIndex / chunks.length) * 100)
      await (adminClient as any)
        .from('ai_compra_task_runs')
        .update({
          result_summary: {
            progress: progressPercent,
            processed_batches: batchIndex,
            total_batches: chunks.length,
          },
        })
        .eq('id', runId)

      const response = await client.responses.create({
        model: model as any,
        instructions: 'Responda somente no formato JSON estruturado solicitado. Nao use dados pessoais.',
        input: buildPrompt(task, chunk || []),
        tools: [
          {
            type: 'web_search',
            search_context_size: 'medium',
            user_location: {
              type: 'approximate',
              country: 'BR',
              timezone: 'America/Sao_Paulo',
            },
          },
        ],
        tool_choice: 'required',
        include: ['web_search_call.action.sources'],
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'compra_oportunidades_ia',
            strict: false,
            schema: OUTPUT_SCHEMA,
          },
        },
        max_output_tokens: 4500,
      })

      if (response.usage) {
        totalUsage.input_tokens += response.usage.input_tokens || 0
        totalUsage.output_tokens += response.usage.output_tokens || 0
        totalUsage.total_tokens += response.usage.total_tokens || 0
      }

      const parsed = parseAiOutput(extractOutputText(response))
      const eventIds: Array<string | null> = []

      for (const aiEvent of parsed.events) {
        const savedId = await saveEvent(adminClient, runId, aiEvent)
        eventIds.push(savedId)
        sourcesCount += Array.isArray(aiEvent.fontes) ? aiEvent.fontes.length : 0
      }

      for (const opportunity of parsed.opportunities.slice(0, maxOpportunities)) {
        if (opportunity.confidence < minConfidence) continue
        if (opportunity.compra_extra <= 0) continue
        if (!productKeys.has(productKey(opportunity))) continue

        const eventId = eventIds[opportunity.event_index] || null
        if (!eventId) continue

        await saveOpportunity(adminClient, runId, eventId, opportunity)
        opportunitiesCount += 1
      }
    }

    await finishRun(adminClient, taskId, runId, {
      status: 'success',
      sourcesCount,
      opportunitiesCount,
      usage: totalUsage,
      resultSummary: {
        progress: 100,
        processed_batches: chunks.length,
        total_batches: chunks.length,
        opportunities_saved: opportunitiesCount,
      },
    })

    return {
      success: true,
      task_id: taskId,
      run_id: runId,
      status: 'success',
      sources_count: sourcesCount,
      opportunities_count: opportunitiesCount,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida ao rodar oportunidades IA.'
    await finishRun(adminClient, taskId, runId, {
      status: 'failed',
      errorMessage: message,
      resultSummary: { error: message },
    })
    console.error('[integrim-notas:oportunidades-ia] task failed:', message)
    return {
      success: false,
      task_id: taskId,
      run_id: runId,
      status: 'failed',
      sources_count: 0,
      opportunities_count: 0,
      error_message: message,
    }
  }
}

export const updateCompraOpportunityStatus = async (
  id: string,
  status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>,
): Promise<IntegrimCompraOportunidadeActionResponse> => {
  const adminClient = createAdminClient()
  const { data, error } = await (adminClient as any)
    .from('compra_oportunidades_ia')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id,status')
    .single()

  if (error) {
    console.error('[integrim-notas:oportunidades-ia] update status failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel atualizar a oportunidade IA.' })
  }

  return {
    success: true,
    id: String(data.id),
    status: String(data.status) as IntegrimCompraOportunidadeStatus,
  }
}
