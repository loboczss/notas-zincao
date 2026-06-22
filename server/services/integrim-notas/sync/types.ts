import type { IntegrimPagedResponse, IntegrimRecord } from '../../stock-integrin/sync/types'

export type IntegrimNotasSyncOptions = {
  companyIds?: number[]
  windowMonths?: number
  // Intervalo explicito (YYYY-MM-DD). Quando ambos vierem, tem prioridade sobre
  // windowMonths. Permite escolher o periodo a sincronizar pelo front-end.
  startDate?: string
  endDate?: string
  dryRun?: boolean
  deactivateStale?: boolean
  triggeredBy?: string
  // Fase A (cabecalhos -> tabela integrim_notas). A previsao de compras nao le
  // essa tabela, entao por padrao o sync pula a Fase A e roda so a agregacao de
  // itens (Fase B). Ligue para tambem espelhar os cabecalhos das notas.
  syncHeaders?: boolean
  onStarted?: (runId: string) => void | Promise<void>
}

export type IntegrimNotasSyncCounters = {
  notasTotal: number
  itensTotal: number
  upsertedRows: number
  deactivatedRows: number
}

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

// Plano de leitura por empresa + modelo (espelha CompanyPagePlan do stock).
export type CompanyModelPlan = {
  idempresa: number
  modelo: string
  firstPage: IntegrimPagedResponse<IntegrimRecord>
  totalPages: number
  totalRows: number
}

export type IntegrimNotaUpsertRow = {
  idempresa: number
  idplanilha: number
  numnota: string | null
  serienota: string | null
  modelo: string | null
  nome_cliente: string | null
  cnpjcpf: string | null
  valcontabil: number | null
  dtmovimento: string | null
  chave: string | null
  flagnotacancel: string | null
  raw: IntegrimRecord
  sync_run_id: string
  is_present: boolean
  last_seen_at: string
  updated_at: string
}
