// Notas fiscais de saida (NF-e 55 + NFC-e 65) das 6 empresas do Integrim.
export const DEFAULT_COMPANY_IDS = [1, 2, 3, 4, 5, 6]

// Janela movel padrao de historico de vendas (meses). Configuravel.
export const DEFAULT_WINDOW_MONTHS = 24

// O servico de itens aceita ate 1000 por pagina (testado): reduz drasticamente
// o numero de requisicoes do backfill de vendas.
export const ITENS_PAGE_SIZE = 1000

// Paginas baixadas em paralelo. O gargalo e a latencia por consulta do Integrim
// (~16-24s/pagina), nao a CPU local; concorrencia limitada multiplica a vazao
// sem inundar o CISSPoder.
export const FETCH_CONCURRENCY = 4

// Teto de paginas por consulta de itens para nao rodar indefinidamente.
export const MAX_PAGES_PER_QUERY = 5000

// Insert em massa do rebuild (produto_valor / venda_dia): a tabela e esvaziada
// antes, entao sao INSERTs simples. Lotes grandes cortam ~7x as idas a rede ao
// Supabase (eram ~1.350 chunks de 150 para 200k linhas de venda/dia).
export const INSERT_CHUNK_SIZE = 1000
