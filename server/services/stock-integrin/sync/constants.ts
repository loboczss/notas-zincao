export const DEFAULT_COMPANY_IDS = [1]
export const DEFAULT_MAX_PAGES = 1000
export const INTEGRIM_PAGE_SIZE = 1000
export const REQUEST_TIMEOUT_MS = 45_000
// Lotes pequenos para cada statement caber no statement_timeout do Postgres: a
// tabela stock_integrin mantem 3 indices GIN (tsvector + trigram) e 3 colunas
// JSONB grandes por linha, entao upserts/updates grandes estouram o tempo limite.
// O job roda em segundo plano, entao mais round-trips nao atrapalham.
export const UPSERT_CHUNK_SIZE = 150
export const STALE_CHUNK_SIZE = 150
