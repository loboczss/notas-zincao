// Notas fiscais de saida (NF-e 55 + NFC-e 65) das 6 empresas do Integrim.
export const DEFAULT_COMPANY_IDS = [1, 2, 3, 4, 5, 6]
export const SUPPORTED_MODELOS = ['55', '65']

// Janela movel padrao de historico de cabecalhos (meses). Configuravel.
export const DEFAULT_WINDOW_MONTHS = 24

// Para a analise de valor so importam os ultimos 365 dias (maior janela de metrica).
// Buscamos itens de venda um pouco alem disso por seguranca.
export const ANALYSIS_WINDOW_DAYS = 400

// O servico de itens aceita ate 1000 por pagina (testado): reduz drasticamente
// o numero de requisicoes do backfill de vendas.
export const ITENS_PAGE_SIZE = 1000

// Teto de paginas por consulta (cabecalhos e itens) para nao rodar indefinidamente.
export const MAX_PAGES_PER_QUERY = 5000

// Lotes pequenos: a agregacao posterior e os indices tornam upserts grandes lentos
// e podem estourar o statement_timeout do Postgres. O sync roda em background.
export const UPSERT_CHUNK_SIZE = 150
export const STALE_CHUNK_SIZE = 150
