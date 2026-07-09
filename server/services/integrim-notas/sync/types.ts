export type IntegrimNotasSyncOptions = {
  companyIds?: number[]
  windowMonths?: number
  // Intervalo explicito (YYYY-MM-DD). Quando ambos vierem, tem prioridade sobre
  // windowMonths. Permite escolher o periodo a sincronizar pelo front-end.
  startDate?: string
  endDate?: string
  dryRun?: boolean
  triggeredBy?: string
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

