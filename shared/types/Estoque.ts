export type EstoqueProdutoPai = {
  id_produto: number
  descricao: string
} | null

export type EstoqueProduto = {
  id_produto: number
  descricao: string
  embalagem_saida: string
  valor_preco_varejo: string | null
  tipo_produto: string | null
  quantidade_estoque: number
  criado_em: string
  atualizado_em: string
  id_produto_pai: number | null
  fator_conversao: number | null
  produto_pai?: EstoqueProdutoPai
}

export type EstoqueProdutoDraft = {
  id_produto?: number
  descricao: string
  embalagem_saida: string
  valor_preco_varejo?: string | null
  tipo_produto?: string | null
  quantidade_estoque?: number | string | null
  id_produto_pai?: number | string | null
  fator_conversao?: number | string | null
}

export type EstoqueListQuery = {
  search?: string
  tipo_produto?: string
  page?: number
  page_size?: number
  limit?: number
}

export type EstoqueListMeta = {
  page: number
  page_size: number
  total_itens: number
  total_paginas: number
}

export type EstoqueStats = {
  quantidade_total_estoque: number
}

export type EstoqueListResponse = {
  success: boolean
  produtos: EstoqueProduto[]
  meta: EstoqueListMeta
  stats: EstoqueStats
}

export type EstoqueSearchResponse = {
  success: boolean
  produtos: EstoqueProduto[]
  meta?: EstoqueListMeta
}

export type EstoqueDetailResponse = {
  success: boolean
  produto: EstoqueProduto
}

export type EstoqueSaveResponse = {
  success: boolean
  produto: EstoqueProduto
}