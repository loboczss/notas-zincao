export type StockIntegrinLocalEstoque = {
  idlocalestoque: number
  descrlocalestoque: string | null
  qtdsaldoatual: number
  qtdsaldoreserva: number
  qtdsaldodisponivel: number
  flaglote: string | null
  flagestnegativo: string | null
  flaginativo: string | null
  dtalteracao: string | null
}

export type StockIntegrinProduto = {
  id: string
  idempresa: number
  idproduto: number
  idsubproduto: number
  idlocalestoque: number
  descrlocalestoque: string | null
  descrcomproduto: string
  descrresproduto: string | null
  nrcodbarprod: string | null
  ncm: string | null
  embalagem_saida: string | null
  descrsecao: string | null
  descrgrupo: string | null
  descrsubgrupo: string | null
  valprecovarejo: number | null
  valpromvarejo: number | null
  valcustorepos: number | null
  custogerencial: number | null
  custonotafiscal: number | null
  qtdsaldoatual: number
  qtdsaldoreserva: number
  qtdsaldodisponivel: number
  locais_estoque: StockIntegrinLocalEstoque[]
  flaglote: string | null
  flagestnegativo: string | null
  flaginativo: string | null
  cad_produto_dtalteracao: string | null
  preco_custo_dtalteracao: string | null
  estoque_dtalteracao: string | null
  integrim_updated_at: string | null
  sync_run_id: string | null
  last_seen_at: string
  is_present: boolean
  created_at: string
  updated_at: string
}

export type StockIntegrinListQuery = {
  search?: string
  idempresa?: number | string | null
  idlocalestoque?: number | string | null
  only_available?: boolean | string
  page?: number
  page_size?: number
  limit?: number
}

export type StockIntegrinListMeta = {
  page: number
  page_size: number
  total_itens: number
  total_paginas: number
}

export type StockIntegrinStats = {
  saldo_disponivel_total: number
  empresas: number[]
  locais: number[]
  ultima_sincronizacao: string | null
}

export type StockIntegrinListResponse = {
  success: boolean
  produtos: StockIntegrinProduto[]
  meta: StockIntegrinListMeta
  stats: StockIntegrinStats
}

export type StockIntegrinSyncRun = {
  id: string
  status: 'running' | 'success' | 'failed' | 'cancelled'
  triggered_by: string
  started_at: string
  finished_at: string | null
  cancel_requested: boolean
  cancel_requested_at: string | null
  cad_produtos_total: number
  precos_total: number
  saldos_total: number
  upserted_rows: number
  deactivated_rows: number
  error_message: string | null
  metadata: Record<string, unknown>
  progress: StockIntegrinSyncProgress | null
}

export type StockIntegrinSyncProgress = {
  phase: 'starting' | 'reading' | 'upserting' | 'deactivating' | 'cancelling' | 'cancelled' | 'done' | 'failed'
  total_pages: number
  processed_pages: number
  total_saldos_estimated: number
  processed_saldos: number
  upserted_rows: number
  deactivated_rows: number
  current_company: number | null
  current_page: number | null
  progress_percent: number
  message: string
  updated_at: string
}

export type StockIntegrinSyncStatusResponse = {
  success: boolean
  latest: StockIntegrinSyncRun | null
  runs: StockIntegrinSyncRun[]
}

export type StockIntegrinSyncRequest = {
  dry_run?: boolean
  max_pages?: number
  company_ids?: number[]
  deactivate_stale?: boolean
}

export type StockIntegrinSyncResponse = {
  success: boolean
  dry_run: boolean
  run_id: string
  cancelled?: boolean
  started?: boolean
  already_running?: boolean
  status?: 'running'
  cad_produtos_total: number
  precos_total: number
  saldos_total: number
  upserted_rows: number
  deactivated_rows: number
  companies: number[]
  samples?: StockIntegrinProduto[]
}

export type StockIntegrinCancelSyncRequest = {
  run_id?: string | null
}

export type StockIntegrinCancelSyncResponse = {
  success: boolean
  cancel_requested: boolean
  cancelled: boolean
  run_id: string | null
  message: string
}
