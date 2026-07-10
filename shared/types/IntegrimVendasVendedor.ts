// Vendas por vendedor — resposta do endpoint /api/integrim-notas/vendas-vendedor.
// Base: integrim_venda_vendedor_dia agregada via RPC integrim_vendas_por_vendedor.
// idvendedor = 0 => "Sem vendedor" (itens sem atribuicao, ~1,6% do faturamento).

export type IntegrimVendaVendedor = {
  idvendedor: number
  nome: string
  faturamento: number
  qtd: number
  num_itens: number
  faturamento_ant: number
  variacao_pct: number | null
}

export type IntegrimVendasVendedorTotais = {
  faturamento: number
  num_itens: number
  faturamento_ant: number
  variacao_pct: number | null
  vendedores: number
  faturamento_sem_vendedor: number
}

export type IntegrimVendasVendedorResponse = {
  success: boolean
  periodo: { date_start: string, date_end: string }
  idempresa: number | null
  vendedores: IntegrimVendaVendedor[]
  totais: IntegrimVendasVendedorTotais
}
