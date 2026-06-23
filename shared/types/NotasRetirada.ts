export type NotaHistoricoEdicao = {
  id: string
  nota_id: string
  user_id: string | null
  created_at: string
  dados_anteriores: Record<string, any> | null
  dados_novos: Record<string, any> | null
  profiles?: {
    nome: string | null
  }
}

export type NotaProduto = {
  nome: string
  quantidade?: number
  valor_unitario?: number
  valor_total?: number
  unidade?: string
  tipo_unidade?: string
  embalagem?: string
  tipo_produto?: string | null
  confidence?: number
  id_produto_estoque?: number | null
  quantidade_retirada?: number
  [key: string]: unknown
}

export type NotaRetiradaHistoricoItem = {
  data: string
  responsavel_id: string
  responsavel_nome?: string | null
  tipo?: 'retirada' | 'tentativa_sem_baixa'
  retirada_efetuada?: boolean
  motivo_falha?: string | null
  fotos?: string[]
  itens_retirados?: Array<{
    index: number
    quantidade: number
    quantidade_solicitada?: number
    id_produto_estoque?: number | null
    id_produto_estoque_baixa?: number | null
  }>
  itens_solicitados?: Array<{
    index: number
    quantidade: number
    id_produto_estoque?: number | null
    id_produto_estoque_baixa?: number | null
  }>
  observacoes?: string | null
  request_id?: string | null
  // Campos legados para retrocompatibilidade de registros antigos
  status_anterior?: NotaRetiradaStatus | null
  status_novo?: NotaRetiradaStatus
  usuario_id?: string
}

export type NotaRetiradaStatus = 'pendente' | 'parcial' | 'retirada' | 'cancelada'

export type NotaRetiradaDraft = {
  contato_id?: string
  idempresa?: number | null
  telefone_cliente?: string
  documento_cliente?: string
  foto_url?: string
  foto_cliente_url?: string
  foto_cupom_data_url?: string
  foto_cliente_data_url?: string
  nome_cliente: string
  numero_nota: string
  serie_nota?: string
  chave_nfe?: string
  data_compra: string
  data_prevista_retirada?: string
  observacoes?: string
  status_retirada?: NotaRetiradaStatus
  produtos: NotaProduto[]
  valor_total?: number | null
  desconto_total?: number | null
}

export type NotaRetiradaListItem = {
  id: string
  contato_id?: string | null
  idempresa?: number | null
  nome_cliente: string
  numero_nota: string
  serie_nota: string
  chave_nfe?: string | null
  data_compra: string
  data_prevista_retirada?: string | null
  data_retirada?: string | null
  valor_total: number | null
  desconto_total?: number | null
  status_retirada: NotaRetiradaStatus
  criado_em: string
  produtos?: NotaProduto[]
  foto_url?: string | null
  foto_cliente_url?: string | null
  comprovante_retirada_url?: string | null
  // Upload de imagens em segundo plano: 'processando' | 'pronta' | 'erro' (null = sem mídia pendente).
  midia_status?: 'processando' | 'pronta' | 'erro' | null
  cadastrado_por_nome?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  deleted_by_profile?: {
    nome?: string | null
  } | null
  _offlineStatus?: 'pending_create' | 'pending_update' | 'pending_delete' | 'pending_retirada' | 'pending_status'
}

export type NotaRetiradaDetalheItem = NotaRetiradaListItem & {
  contato_id?: string | null
  produtos: NotaProduto[]
  historico_retiradas?: NotaRetiradaHistoricoItem[] | null
  foto_url?: string | null
  documento_cliente?: string | null
  telefone_cliente?: string | null
  observacoes?: string | null
  cadastrado_por_nome?: string | null
  criado_em: string
}

export type NotaRetiradaProdutoInput = {
  nome: string
  quantidade_retirada: number
}

export type NotaRegistrarRetiradaRequest = {
  produtos_retirada: NotaRetiradaProdutoInput[]
  foto_cliente_retirada_data_url: string
  observacoes?: string | null
  request_id?: string
}

export type NotaRetiradaStatusUpdateRequest = {
  status_retirada: NotaRetiradaStatus
  data_retirada?: string | null
  retirada_confirmada_por?: string | null
  comprovante_retirada_url?: string | null
  observacoes?: string | null
}

export type NotaAdminEditRequest = {
  contato_id?: string | null
  nome_cliente?: string
  documento_cliente?: string | null
  telefone_cliente?: string | null
  produtos?: NotaProduto[]
  observacoes?: string | null
}

export type NotaMissingField =
  | 'nome_cliente'
  | 'telefone_cliente'
  | 'documento_cliente'
  | 'numero_nota'
  | 'serie_nota'
  | 'chave_nfe'
  | 'data_compra'
  | 'produtos'

export type NotaExtractionRequest = {
  imageDataUrl: string
}

export type NotaExtractionResponse = {
  draft: NotaRetiradaDraft
  missingFields: NotaMissingField[]
}

export type NotaIntegrimLookupCandidate = {
  idempresa: number
  idplanilha: number
  numero_nota: string
  serie_nota: string
  modelo: string
  nome_cliente: string
  documento_cliente: string
  data_compra: string
  valor_total: number | null
}

export type NotaIntegrimLookupRequest = {
  numero_nota: string
  serie_nota?: string | null
  idempresa?: number | null
  idplanilha?: number | null
}

export type NotaIntegrimLookupHints = {
  numero_nota: string
  serie_nota: string
  chave_nfe: string
  missingFields: Array<'numero_nota' | 'serie_nota' | 'chave_nfe'>
}

export type NotaImageProductsResponse = {
  success: true
  produtos: NotaProduto[]
  missingFields: Array<'produtos'>
}

export type NotaImageChaveResponse = {
  success: true
  hints: NotaIntegrimLookupHints
}

export type NotaIntegrimLookupResponse = {
  success: true
  found: boolean
  message: string
  draft?: NotaRetiradaDraft
  candidate?: NotaIntegrimLookupCandidate
  candidates?: NotaIntegrimLookupCandidate[]
  missingFields?: NotaMissingField[]
  hints?: NotaIntegrimLookupHints
}
