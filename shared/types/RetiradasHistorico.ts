export type RetiradaHistoricoItem = {
  nome: string
  quantidade: number
}

export type RetiradaHistoricoEvento = {
  id_nota: string
  numero_nota: string
  serie_nota: string
  nome_cliente: string
  data: string
  responsavel_nome: string
  observacoes?: string | null
  itens: RetiradaHistoricoItem[]
  reducao_zinco_10: number
}

export type RetiradaHistoricoSortKey = 'data' | 'nome_cliente' | 'itens' | 'reducao_zinco_10'

export type RetiradaHistoricoSortOrder = 'asc' | 'desc'

export type RetiradaHistoricoSortOption = {
  key: RetiradaHistoricoSortKey
  label: string
  description: string
}
