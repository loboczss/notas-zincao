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
  dry_run?: boolean
  deactivate_stale?: boolean
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
}

export type IntegrimProdutoValorSort =
  | 'score_valor'
  | 'faturamento_365d'
  | 'margem_365d'
  | 'qtd_365d'
  | 'giro_diario'
  | 'dias_cobertura'
  | 'sugestao_compra'

export type IntegrimProdutoValorQuery = {
  search?: string
  idempresa?: number | string | null
  sort?: IntegrimProdutoValorSort
  page?: number
  page_size?: number
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
  produtos_em_risco: number
  ultima_sincronizacao: string | null
}

export type IntegrimProdutoValorResponse = {
  success: boolean
  produtos: IntegrimProdutoValor[]
  meta: IntegrimProdutoValorMeta
  stats: IntegrimProdutoValorStats
}
