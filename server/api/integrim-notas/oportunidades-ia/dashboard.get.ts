import { serverSupabaseUser } from '#supabase/server'
import type {
  IntegrimCompraAiDashboardResponse,
  IntegrimCompraAiEvento,
  IntegrimCompraAiOportunidade,
  IntegrimCompraAiTask,
  IntegrimCompraAiTaskRun,
  IntegrimCompraEventoTipo,
  IntegrimCompraOportunidadeStatus,
} from '../../../../shared/types/IntegrimNotas'
import { createAdminClient } from '../../../services/integrim-notas/sync/repository'

type AdminClient = ReturnType<typeof createAdminClient>

const EVENT_TYPES = new Set<IntegrimCompraEventoTipo>([
  'clima',
  'cidade',
  'esporte',
  'feriado',
  'obra',
  'tendencia',
  'fornecedor',
])

const OPPORTUNITY_STATUS = new Set<IntegrimCompraOportunidadeStatus>([
  'nova',
  'aceita',
  'ignorada',
  'comprada',
  'expirada',
])

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const nullableString = (value: unknown) => {
  const text = String(value ?? '').trim()
  return text || null
}

const objectValue = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

const arrayValue = (value: unknown): unknown[] => Array.isArray(value) ? value : []

const productKey = (input: { idempresa: unknown, idproduto: unknown, idsubproduto: unknown }) =>
  `${numberValue(input.idempresa)}:${numberValue(input.idproduto)}:${numberValue(input.idsubproduto)}`

const toTask = (row: Record<string, unknown>): IntegrimCompraAiTask => ({
  id: String(row.id),
  name: String(row.name || ''),
  task_type: 'opportunity_research',
  enabled: row.enabled !== false,
  schedule_cron: String(row.schedule_cron || '15 9,19 * * *'),
  timezone: String(row.timezone || 'America/Sao_Paulo'),
  next_run_at: nullableString(row.next_run_at),
  locked_at: nullableString(row.locked_at),
  last_run_at: nullableString(row.last_run_at),
  last_success_at: nullableString(row.last_success_at),
  params: objectValue(row.params),
  created_at: String(row.created_at || ''),
  updated_at: String(row.updated_at || ''),
})

const toRun = (row: Record<string, unknown>, taskNames: Map<string, string>): IntegrimCompraAiTaskRun => {
  const taskId = String(row.task_id || '')
  const status = String(row.status || 'failed') as IntegrimCompraAiTaskRun['status']

  return {
    id: String(row.id),
    task_id: taskId,
    task_name: taskNames.get(taskId) || null,
    status: status === 'running' || status === 'success' ? status : 'failed',
    started_at: String(row.started_at || ''),
    finished_at: nullableString(row.finished_at),
    sources_count: numberValue(row.sources_count),
    opportunities_count: numberValue(row.opportunities_count),
    error_message: nullableString(row.error_message),
    usage: objectValue(row.usage),
    result_summary: objectValue(row.result_summary),
  }
}

const toEvento = (row: Record<string, unknown>): IntegrimCompraAiEvento => {
  const tipo = String(row.tipo || 'cidade') as IntegrimCompraEventoTipo

  return {
    id: String(row.id),
    task_run_id: nullableString(row.task_run_id),
    origem: row.origem === 'manual' ? 'manual' : 'ia',
    tipo: EVENT_TYPES.has(tipo) ? tipo : 'cidade',
    titulo: String(row.titulo || ''),
    resumo: String(row.resumo || ''),
    data_inicio: nullableString(row.data_inicio),
    data_fim: nullableString(row.data_fim),
    regiao: nullableString(row.regiao),
    fontes: arrayValue(row.fontes),
    confidence: numberValue(row.confidence),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  }
}

const toOportunidade = (
  row: Record<string, unknown>,
  eventos: Map<string, IntegrimCompraAiEvento>,
  produtos: Map<string, string | null>,
): IntegrimCompraAiOportunidade => {
  const status = String(row.status || 'nova') as IntegrimCompraOportunidadeStatus
  const eventoId = nullableString(row.evento_id)
  const evento = eventoId ? eventos.get(eventoId) || null : null

  return {
    id: String(row.id),
    task_run_id: nullableString(row.task_run_id),
    evento_id: eventoId,
    evento_tipo: evento?.tipo || null,
    evento_titulo: evento?.titulo || null,
    idempresa: numberValue(row.idempresa),
    idproduto: numberValue(row.idproduto),
    idsubproduto: numberValue(row.idsubproduto),
    descricao: produtos.get(productKey(row as { idempresa: unknown, idproduto: unknown, idsubproduto: unknown })) || null,
    compra_extra: numberValue(row.compra_extra),
    confidence: numberValue(row.confidence),
    motivo: String(row.motivo || ''),
    evidencias: arrayValue(row.evidencias),
    fontes: evento?.fontes || [],
    contra_argumento: nullableString(row.contra_argumento),
    status: OPPORTUNITY_STATUS.has(status) ? status : 'nova',
    valid_until: nullableString(row.valid_until),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  }
}

const countRows = async (
  client: AdminClient,
  table: string,
  build?: (query: any) => any,
) => {
  let request = (client as any)
    .from(table)
    .select('id', { count: 'exact', head: true })
  if (build) request = build(request)
  const { count, error } = await request
  if (error) throw error
  return count || 0
}

export default defineEventHandler(async (event): Promise<IntegrimCompraAiDashboardResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sessao invalida.' })

  const client = createAdminClient()

  const [
    tasksResult,
    runsResult,
    recentEventsResult,
    opportunitiesResult,
  ] = await Promise.all([
    (client as any)
      .from('ai_compra_tasks')
      .select('*')
      .order('enabled', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(25),
    (client as any)
      .from('ai_compra_task_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20),
    (client as any)
      .from('compra_eventos_contexto')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
    (client as any)
      .from('compra_oportunidades_ia')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  for (const result of [tasksResult, runsResult, recentEventsResult, opportunitiesResult]) {
    if (result.error) throw result.error
  }

  const tasks = ((tasksResult.data || []) as Array<Record<string, unknown>>).map(toTask)
  const taskNames = new Map(tasks.map(task => [task.id, task.name]))
  const runs = ((runsResult.data || []) as Array<Record<string, unknown>>).map(row => toRun(row, taskNames))
  const eventos = ((recentEventsResult.data || []) as Array<Record<string, unknown>>).map(toEvento)
  const eventosById = new Map(eventos.map(evento => [evento.id, evento]))

  const opportunityRows = (opportunitiesResult.data || []) as Array<Record<string, unknown>>
  const missingEventIds = [...new Set(opportunityRows.map(row => nullableString(row.evento_id)).filter((id): id is string => Boolean(id)))]
    .filter(id => !eventosById.has(id))
  if (missingEventIds.length) {
    const { data, error } = await (client as any)
      .from('compra_eventos_contexto')
      .select('*')
      .in('id', missingEventIds)
    if (error) throw error
    for (const evento of ((data || []) as Array<Record<string, unknown>>).map(toEvento)) {
      eventosById.set(evento.id, evento)
    }
  }

  const productIds = [...new Set(opportunityRows.map(row => numberValue(row.idproduto)).filter(Boolean))]
  const produtos = new Map<string, string | null>()
  if (productIds.length) {
    const { data, error } = await (client as any)
      .from('integrim_produto_valor')
      .select('idempresa,idproduto,idsubproduto,descricao')
      .in('idproduto', productIds)
    if (error) throw error
    for (const row of (data || []) as Array<Record<string, unknown>>) {
      produtos.set(productKey(row as { idempresa: unknown, idproduto: unknown, idsubproduto: unknown }), nullableString(row.descricao))
    }
  }

  const oportunidades = opportunityRows.map(row => toOportunidade(row, eventosById, produtos))
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    runs24h,
    oportunidadesNovas,
    oportunidadesAceitas,
    oportunidadesCompradas,
    eventos30d,
  ] = await Promise.all([
    countRows(client, 'ai_compra_task_runs', query => query.gte('started_at', since24h)),
    countRows(client, 'compra_oportunidades_ia', query => query.eq('status', 'nova')),
    countRows(client, 'compra_oportunidades_ia', query => query.eq('status', 'aceita')),
    countRows(client, 'compra_oportunidades_ia', query => query.eq('status', 'comprada')),
    countRows(client, 'compra_eventos_contexto', query => query.gte('created_at', since30d)),
  ])

  return {
    success: true,
    tasks,
    runs,
    eventos,
    oportunidades,
    stats: {
      tasks_total: tasks.length,
      tasks_enabled: tasks.filter(task => task.enabled).length,
      runs_24h: runs24h,
      last_run_status: runs[0]?.status || null,
      oportunidades_novas: oportunidadesNovas,
      oportunidades_aceitas: oportunidadesAceitas,
      oportunidades_compradas: oportunidadesCompradas,
      eventos_30d: eventos30d,
    },
  }
})
