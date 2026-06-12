import type { StockIntegrinProduto } from '../../../../shared/types/StockIntegrin'

export type IntegrimClause = {
  campo: string
  operadorlogico: 'AND'
  operador: 'IGUAL' | 'MENOR' | 'MAIOR' | 'MENOR_IGUAL' | 'MAIOR_IGUAL' | 'LIKE' | 'BETWEEN' | 'IGUAL_NULL'
  valor: unknown
}

export type IntegrimOrder = {
  campo: string
  direcao: 'ASC' | 'DESC'
}

export type IntegrimConfig = {
  baseUrl: string
  username: string
  password: string
  clientId: string
  clientSecret: string
  companyIds: number[]
}

export type IntegrimPagedResponse<T> = {
  data: T[]
  total: number
  hasNext: boolean
}

export type IntegrimRecord = Record<string, unknown>

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

export type StockIntegrinUpsertRow = Omit<StockIntegrinProduto, 'id' | 'created_at'> & {
  raw_cad_produto: IntegrimRecord
  raw_preco_custo: IntegrimRecord
  raw_saldo_estoque: IntegrimRecord
}

export type FetchSourceResult = {
  cadProdutos: IntegrimRecord[]
  precos: IntegrimRecord[]
  saldos: IntegrimRecord[]
}

export type StockIntegrinSyncOptions = {
  dryRun?: boolean
  maxPages?: number
  companyIds?: number[]
  deactivateStale?: boolean
  triggeredBy?: string
  onStarted?: (runId: string) => void | Promise<void>
}

export type StockIntegrinSyncProgressPhase =
  | 'starting'
  | 'reading'
  | 'upserting'
  | 'deactivating'
  | 'cancelling'
  | 'cancelled'
  | 'done'
  | 'failed'

export type StockIntegrinSyncProgress = {
  phase: StockIntegrinSyncProgressPhase
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

export type StockIntegrinSyncCounters = {
  cadProdutosTotal: number
  precosTotal: number
  saldosTotal: number
  upsertedRows: number
  deactivatedRows: number
}

export type CompanyPagePlan = {
  idempresa: number
  firstPage: IntegrimPagedResponse<IntegrimRecord>
  totalPages: number
  totalRows: number
}

export class IntegrimHttpError extends Error {
  status: number
  service: string
  body: string

  constructor(service: string, status: number, body: string) {
    super(`Integrim ${service} retornou HTTP ${status}: ${body}`)
    this.name = 'IntegrimHttpError'
    this.status = status
    this.service = service
    this.body = body
  }
}
