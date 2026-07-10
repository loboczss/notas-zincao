// Vendas por loja (empresa) — resposta do endpoint /api/integrim-notas/vendas-loja.
// Base: integrim_produto_venda_dia agregada por idempresa via RPC
// integrim_vendas_por_loja(p_date_start, p_date_end).

export type IntegrimVendaLoja = {
  idempresa: number
  nome: string
  faturamento: number
  qtd: number
  num_notas: number
  faturamento_ant: number
  variacao_pct: number | null
}

export type IntegrimVendasLojaTotais = {
  faturamento: number
  num_notas: number
  faturamento_ant: number
  variacao_pct: number | null
  lojas: number
}

export type IntegrimVendasLojaResponse = {
  success: boolean
  periodo: { date_start: string, date_end: string }
  lojas: IntegrimVendaLoja[]
  totais: IntegrimVendasLojaTotais
}

// De-para idempresa -> nome da loja (nomefantasia do serviço CAD_LOJAS do Integrim).
// Empresas ativas hoje: 1, 3, 4, 6 (2 e 5 sem vendas). Empresa 1 e 2 têm o mesmo
// nomefantasia "Zincão" no cadastro; a 2 está inativa, então não conflita na tela.
export const LOJA_NOMES: Record<number, string> = {
  1: 'Zincão',
  2: 'Zincão (2)',
  3: 'Zincão Comércio',
  4: 'Zincão Tarauacá',
  5: 'Zincão SC',
  6: 'Zincão Beira Rio',
}

export const nomeLoja = (idempresa: number): string =>
  LOJA_NOMES[idempresa] || `Loja ${idempresa}`
