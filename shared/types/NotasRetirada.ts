export type NotaProduto = {
  nome: string
  quantidade?: number
  valor_unitario?: number
  unidade?: string
  quantidade_retirada?: number
}

export type NotaRetiradaStatus = 'pendente' | 'parcial' | 'retirada' | 'cancelada'

export type NotaRetiradaDraft = {
  contato_id?: string
  telefone_cliente?: string
  documento_cliente?: string
  foto_url?: string
  foto_cliente_url?: string
  foto_cupom_data_url?: string
  foto_cliente_data_url?: string
  nome_cliente: string
  numero_nota: string
  serie_nota: string
  chave_nfe?: string
  data_compra: string
  data_prevista_retirada?: string
  observacoes?: string
  status_retirada?: NotaRetiradaStatus
  produtos: NotaProduto[]
  valor_total?: number | null
}

export type NotaRetiradaListItem = {
  id: string
  contato_id?: string | null
  nome_cliente: string
  numero_nota: string
  serie_nota: string
  data_compra: string
  data_retirada?: string | null
  valor_total: number | null
  status_retirada: NotaRetiradaStatus
  criado_em: string
  produtos?: NotaProduto[]
  foto_url?: string | null
  foto_cliente_url?: string | null
  comprovante_retirada_url?: string | null
}

export type NotaRetiradaDetalheItem = NotaRetiradaListItem & {
  produtos: NotaProduto[]
  foto_url?: string | null
  foto_cliente_url?: string | null
  comprovante_retirada_url?: string | null
}

export type NotaRetiradaProdutoInput = {
  nome: string
  quantidade_retirada: number
}

export type NotaRegistrarRetiradaRequest = {
  produtos_retirada: NotaRetiradaProdutoInput[]
  foto_cliente_retirada_data_url: string
  observacoes?: string | null
}

export type NotaRetiradaStatusUpdateRequest = {
  status_retirada: NotaRetiradaStatus
  data_retirada?: string | null
  retirada_confirmada_por?: string | null
  comprovante_retirada_url?: string | null
  observacoes?: string | null
}

export type NotaMissingField =
  | 'nome_cliente'
  | 'telefone_cliente'
  | 'numero_nota'
  | 'serie_nota'
  | 'data_compra'
  | 'produtos'

export type NotaExtractionRequest = {
  imageDataUrl: string
}

export type NotaExtractionResponse = {
  draft: NotaRetiradaDraft
  missingFields: NotaMissingField[]
}
