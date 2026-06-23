// Tipos das notas fiscais do Integrim e da analise de previsao de compras.
// Totalmente separado de NotasRetirada.ts.

export type IntegrimNotasSyncProgressPhase =
  | 'starting'
  | 'reading'
  | 'upserting'
  | 'deactivating'
  | 'aggregating'
  | 'cancelled'
  | 'done'
  | 'failed'

export type IntegrimNotasSyncProgress = {
  phase: IntegrimNotasSyncProgressPhase
  total_pages: number
  processed_pages: number
  notas_total: number
  itens_total: number
  upserted_rows: number
  deactivated_rows: number
  current_company: number | null
  current_modelo: string | null
  current_page: number | null
  progress_percent: number
  message: string
  detail?: string | null
  updated_at: string
}

export type IntegrimNotasSyncRun = {
  id: string
  status: 'running' | 'success' | 'failed' | 'cancelled'
  triggered_by: string
  started_at: string
  finished_at: string | null
  cancel_requested: boolean
  cancel_requested_at: string | null
  notas_total: number
  itens_total: number
  upserted_rows: number
  deactivated_rows: number
  error_message: string | null
  metadata: Record<string, unknown>
  progress: IntegrimNotasSyncProgress | null
}

export type IntegrimNotasSyncStatusResponse = {
  success: boolean
  latest: IntegrimNotasSyncRun | null
  runs: IntegrimNotasSyncRun[]
}

export type IntegrimNotasSyncRequest = {
  company_ids?: number[]
  window_months?: number
  // Intervalo explicito (YYYY-MM-DD) escolhido no front. Quando ambos vierem,
  // tem prioridade sobre window_months.
  date_start?: string
  date_end?: string
  dry_run?: boolean
  deactivate_stale?: boolean
  // Inclui a Fase A (cabecalhos -> integrim_notas). A previsao de compras nao usa
  // essa tabela; por padrao o sync roda so a agregacao de itens (mais rapido).
  sync_headers?: boolean
}

export type IntegrimNotasSyncResponse = {
  success: boolean
  dry_run: boolean
  run_id: string
  cancelled?: boolean
  started?: boolean
  already_running?: boolean
  status?: 'running'
  notas_total: number
  itens_total: number
  upserted_rows: number
  deactivated_rows: number
  companies: number[]
}

export type IntegrimNotasCancelSyncRequest = {
  run_id?: string | null
}

export type IntegrimNotasCancelSyncResponse = {
  success: boolean
  cancel_requested: boolean
  cancelled: boolean
  run_id: string | null
  message: string
}

// ---------------------------------------------------------------------------
// Analise de valor / previsao de compras (tabela integrim_produto_valor)
// ---------------------------------------------------------------------------

export type IntegrimProdutoValor = {
  id: string
  idempresa: number
  idproduto: number
  idsubproduto: number
  descricao: string | null
  saldo_disponivel: number
  custo_unit: number | null
  qtd_30d: number
  qtd_90d: number
  qtd_180d: number
  qtd_365d: number
  faturamento_30d: number
  faturamento_90d: number
  faturamento_180d: number
  faturamento_365d: number
  margem_365d: number
  num_notas_365d: number
  ultima_venda: string | null
  giro_diario: number
  dias_cobertura: number | null
  sugestao_compra: number
  score_valor: number
  updated_at: string
  qtd_periodo: number
  faturamento_periodo: number
  margem_periodo: number
  num_notas_periodo: number
  periodo_dias: number
  date_start: string
  date_end: string
  coverage_days: number
  prev_qtd_periodo: number
  prev_faturamento_periodo: number
  variacao_qtd_percent: number | null
  variacao_faturamento_percent: number | null
  ai_oportunidade: IntegrimCompraOportunidadeResumo | null
}

export type IntegrimProdutoValorSort =
  | 'score_valor'
  | 'faturamento_periodo'
  | 'margem_periodo'
  | 'qtd_periodo'
  | 'faturamento_365d'
  | 'margem_365d'
  | 'qtd_365d'
  | 'giro_diario'
  | 'dias_cobertura'
  | 'sugestao_compra'
  | 'oportunidade_ia'

export type IntegrimProdutoOportunidadeFilter =
  | 'all'
  | 'calculo'
  | 'ia'
  | 'ambos'

export type IntegrimProdutoValorQuery = {
  search?: string
  idempresa?: number | string | null
  sort?: IntegrimProdutoValorSort
  page?: number
  page_size?: number
  date_start?: string | null
  date_end?: string | null
  coverage_days?: number | string | null
  compare_previous?: boolean | string | null
  oportunidade_filter?: IntegrimProdutoOportunidadeFilter
}

export type IntegrimProdutoValorMeta = {
  page: number
  page_size: number
  total_itens: number
  total_paginas: number
}

export type IntegrimProdutoValorStats = {
  total_produtos: number
  faturamento_365d_total: number
  margem_365d_total: number
  faturamento_periodo_total: number
  margem_periodo_total: number
  produtos_em_risco: number
  oportunidades_ia: number
  ultima_sincronizacao: string | null
}

export type IntegrimCompraOportunidadeStatus =
  | 'nova'
  | 'aceita'
  | 'ignorada'
  | 'comprada'
  | 'expirada'

export type IntegrimCompraEventoTipo =
  | 'clima'
  | 'cidade'
  | 'esporte'
  | 'feriado'
  | 'obra'
  | 'tendencia'
  | 'fornecedor'

export type IntegrimCompraProdutoSelectionMode =
  | 'top_score'
  | 'top_revenue'
  | 'top_margin'
  | 'top_quantity'
  | 'random'
  | 'specific'

export type IntegrimCompraOportunidadeResumo = {
  id: string
  evento_id: string | null
  evento_tipo: IntegrimCompraEventoTipo | null
  evento_titulo: string | null
  status: IntegrimCompraOportunidadeStatus
  compra_extra: number
  confidence: number
  motivo: string
  evidencias: unknown[]
  fontes: unknown[]
  contra_argumento: string | null
  valid_until: string | null
}

export type IntegrimCompraOportunidadeActionRequest = {
  status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>
}

export type IntegrimCompraOportunidadeActionResponse = {
  success: boolean
  id: string
  status: IntegrimCompraOportunidadeStatus
}

export type IntegrimCompraTaskRunResponse = {
  success: boolean
  task_id: string | null
  run_id: string | null
  status: 'success' | 'failed' | 'skipped'
  sources_count: number
  opportunities_count: number
  error_message?: string | null
}

export type IntegrimCompraAiTaskParams = {
  region?: string
  city?: string
  state?: string
  model?: string
  min_confidence?: number
  max_opportunities?: number
  sources?: IntegrimCompraEventoTipo[]
  idempresa?: number | null
  history_date_start?: string | null
  history_date_end?: string | null
  coverage_days?: number | null
  products_per_ai_call?: number | null
  custom_prompt?: string | null
  product_selection?: {
    mode?: IntegrimCompraProdutoSelectionMode
    limit?: number
    specific_products?: string[]
  }
  schedule?: {
    mode?: 'daily' | 'weekly' | 'monthly' | 'yearly'
    times?: string[]
    weekdays?: number[]
    month_day?: number
    year_month?: number
    year_day?: number
    crons?: string[]
  }
  [key: string]: unknown
}

export type IntegrimCompraAiTask = {
  id: string
  name: string
  task_type: 'opportunity_research'
  enabled: boolean
  schedule_cron: string
  timezone: string
  next_run_at: string | null
  locked_at: string | null
  last_run_at: string | null
  last_success_at: string | null
  params: IntegrimCompraAiTaskParams
  created_at: string
  updated_at: string
}

export type IntegrimCompraAiTaskRun = {
  id: string
  task_id: string
  task_name: string | null
  status: 'running' | 'success' | 'failed'
  started_at: string
  finished_at: string | null
  sources_count: number
  opportunities_count: number
  error_message: string | null
  usage: Record<string, unknown>
  result_summary: Record<string, unknown>
}

export type IntegrimCompraAiEvento = {
  id: string
  task_run_id: string | null
  origem: 'ia' | 'manual'
  tipo: IntegrimCompraEventoTipo
  titulo: string
  resumo: string
  data_inicio: string | null
  data_fim: string | null
  regiao: string | null
  fontes: unknown[]
  confidence: number
  created_at: string
  updated_at: string
}

export type IntegrimCompraAiOportunidade = {
  id: string
  task_run_id: string | null
  evento_id: string | null
  evento_tipo: IntegrimCompraEventoTipo | null
  evento_titulo: string | null
  idempresa: number
  idproduto: number
  idsubproduto: number
  descricao: string | null
  compra_extra: number
  confidence: number
  motivo: string
  evidencias: unknown[]
  fontes: unknown[]
  contra_argumento: string | null
  status: IntegrimCompraOportunidadeStatus
  valid_until: string | null
  created_at: string
  updated_at: string
}

export type IntegrimCompraAiDashboardStats = {
  tasks_total: number
  tasks_enabled: number
  runs_24h: number
  last_run_status: IntegrimCompraAiTaskRun['status'] | null
  oportunidades_novas: number
  oportunidades_aceitas: number
  oportunidades_compradas: number
  eventos_30d: number
}

export type IntegrimCompraAiDashboardResponse = {
  success: boolean
  tasks: IntegrimCompraAiTask[]
  runs: IntegrimCompraAiTaskRun[]
  eventos: IntegrimCompraAiEvento[]
  oportunidades: IntegrimCompraAiOportunidade[]
  stats: IntegrimCompraAiDashboardStats
}

export type IntegrimCompraAiTaskUpsertRequest = {
  name?: string
  enabled?: boolean
  schedule_cron?: string
  timezone?: string
  params?: IntegrimCompraAiTaskParams
}

export type IntegrimCompraAiTaskResponse = {
  success: boolean
  task: IntegrimCompraAiTask
}

// Cobertura de dados diarios para o periodo pedido (Fase 2 - honestidade).
export type IntegrimVendaDiaCoverage = {
  has_daily_rows: boolean
  daily_min_date: string | null
  daily_max_date: string | null
  dias_com_dados: number
  periodo_dias: number
  fallback_aplicavel: boolean
  periodo_coberto: boolean
}

export type IntegrimProdutoValorResponse = {
  success: boolean
  produtos: IntegrimProdutoValor[]
  meta: IntegrimProdutoValorMeta
  stats: IntegrimProdutoValorStats
  coverage: IntegrimVendaDiaCoverage
}

// ---------------------------------------------------------------------------
// Agendamento da sincronizacao (tabela integrim_sync_schedule)
// ---------------------------------------------------------------------------

export type IntegrimSyncSchedule = {
  enabled: boolean
  times: string[]
  window_months: number
  timezone: string
  deactivate_stale: boolean
  updated_at: string | null
  updated_by: string | null
  next_run_at: string | null
}

export type IntegrimSyncScheduleResponse = {
  success: boolean
  schedule: IntegrimSyncSchedule
}

export type IntegrimSyncScheduleUpdateRequest = {
  enabled?: boolean
  times?: string[]
  window_months?: number
  timezone?: string
  deactivate_stale?: boolean
}

// ---------------------------------------------------------------------------
// Saude do sync (Fase 3) e parametros de compra
// ---------------------------------------------------------------------------

export type IntegrimSyncHealth = {
  last_success_at: string | null
  last_finished_at: string | null
  last_status: string | null
  last_error: string | null
  last_triggered_by: string | null
  running: boolean
  daily_rows: number
  daily_min_date: string | null
  daily_max_date: string | null
  daily_stale_days: number | null
  produtos: number
  base_updated_at: string | null
}

export type IntegrimSyncHealthResponse = {
  success: boolean
  health: IntegrimSyncHealth
}

export type IntegrimCompraParametros = {
  lead_time_dias: number
  coverage_days: number
  updated_at: string | null
  updated_by: string | null
}

export type IntegrimCompraParametrosUpdateRequest = {
  lead_time_dias?: number
  coverage_days?: number
}

// ---------------------------------------------------------------------------
// Inteligencia de compra: Curva ABC, Sazonalidade, Ruptura (ideias adicionais)
// ---------------------------------------------------------------------------

export type IntegrimAbcClasse = 'A' | 'B' | 'C'
export type IntegrimAbcMetric = 'faturamento' | 'margem' | 'quantidade'

export type IntegrimAbcRow = {
  idempresa: number
  idproduto: number
  idsubproduto: number
  descricao: string | null
  valor: number
  participacao: number
  acumulado: number
  classe: IntegrimAbcClasse
}

export type IntegrimAbcResponse = {
  success: boolean
  rows: IntegrimAbcRow[]
  meta: IntegrimProdutoValorMeta
  resumo: {
    metric: IntegrimAbcMetric
    classe_a: number
    classe_b: number
    classe_c: number
    valor_total: number
  }
}

export type IntegrimSazonalidadeRow = {
  mes: number
  qtd: number
  faturamento: number
  num_notas: number
  qtd_share: number
  faturamento_share: number
}

export type IntegrimSazonalidadeAno = {
  ano: number
  qtd: number
  faturamento: number
  num_notas: number
}

export type IntegrimSazonalidadeResponse = {
  success: boolean
  rows: IntegrimSazonalidadeRow[]
  requer_backfill: boolean
  ano: number | null
  anos: IntegrimSazonalidadeAno[]
}

export type IntegrimRupturaRow = {
  idempresa: number
  idproduto: number
  idsubproduto: number
  descricao: string | null
  saldo_disponivel: number
  custo_unit: number | null
  giro_diario: number
  dias_cobertura: number | null
  data_ruptura: string | null
  lead_time_dias: number
  coverage_days: number
  sugestao_compra: number
  custo_sugestao: number
}

export type IntegrimRupturaResponse = {
  success: boolean
  rows: IntegrimRupturaRow[]
  meta: IntegrimProdutoValorMeta
  resumo: {
    total_risco: number
    custo_total: number
  }
  parametros: IntegrimCompraParametros
}

// --- Lista de Compra do Dia (motor de decisao: ponto de reposicao) ---

export type IntegrimListaCompraSort = 'risco' | 'ruptura' | 'sugestao' | 'faturamento'

export type IntegrimListaCompraRow = {
  idempresa: number
  idproduto: number
  idsubproduto: number
  descricao: string
  estoque_ausente: boolean
  saldo_disponivel: number
  custo_unit: number | null
  demanda_diaria: number
  desvio_diario: number
  cv: number | null
  lead_time_dias: number
  coverage_days: number
  estoque_seguranca: number
  ponto_reposicao: number
  dias_ate_ruptura: number | null
  precisa_comprar: boolean
  sugestao_compra: number
  capital_necessario: number
  margem_unit: number | null
  dinheiro_em_risco: number
  faturamento_periodo: number
  qtd_periodo: number
  dias_com_venda: number
  ultima_venda: string | null
  tendencia_percent: number | null
  classe_abc: 'A' | 'B' | 'C'
  classe_xyz: 'X' | 'Y' | 'Z'
  confianca: 'alta' | 'media' | 'baixa'
}

export type IntegrimListaCompraStats = {
  total_itens: number
  itens_comprar: number
  capital_total: number
  risco_total: number
}

export type IntegrimListaCompraQuery = {
  idempresa?: number | null
  lead_time_dias?: number | null
  coverage_days?: number | null
  service_level?: number | null
  horizon_days?: number | null
  only_buy?: boolean
  search?: string
  sort?: IntegrimListaCompraSort
  page?: number
  page_size?: number
}

export type IntegrimListaCompraResponse = {
  success: boolean
  rows: IntegrimListaCompraRow[]
  meta: IntegrimProdutoValorMeta
  stats: IntegrimListaCompraStats
  parametros: IntegrimCompraParametros
}
