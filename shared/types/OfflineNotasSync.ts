import type {
  NotaProduto,
  NotaRetiradaHistoricoItem,
  NotaRetiradaStatus,
} from './NotasRetirada'

export type OfflineNotaAssetKind =
  | 'cupom'
  | 'cliente'
  | 'comprovante_retirada'
  | 'historico_retirada'

export type OfflineNotaAsset = {
  id: string
  nota_id: string
  kind: OfflineNotaAssetKind
  field: string
  bucket: string
  path: string
  source_value: string
  download_url: string | null
  expires_at: string | null
}

export type OfflineNotaSyncData = {
  id: string
  owner_user_id: string
  contato_id: string | null
  idempresa: number | null
  foto_url: string | null
  foto_cliente_url: string | null
  nome_cliente: string
  documento_cliente: string | null
  telefone_cliente: string | null
  numero_nota: string
  serie_nota: string
  chave_nfe: string | null
  data_compra: string
  data_prevista_retirada: string | null
  produtos: NotaProduto[]
  valor_total: number | null
  desconto_total: number
  observacoes: string | null
  status_retirada: NotaRetiradaStatus
  data_retirada: string | null
  retirada_confirmada_por: string | null
  comprovante_retirada_url: string | null
  criado_em: string
  atualizado_em: string
  historico_retiradas: NotaRetiradaHistoricoItem[] | null
  deleted_at: string | null
  deleted_by: string | null
  cadastrado_por_nome: string | null
}

export type OfflineNotaSyncItem = {
  id: string
  updated_at: string
  deleted_at: string | null
  sync_key: string
  data: OfflineNotaSyncData
  assets: OfflineNotaAsset[]
  asset_count: number
}

export type OfflineNotasSyncPagination = {
  page: number
  page_size: number
  total: number
  total_pages: number
  has_more: boolean
  next_page: number | null
}

export type OfflineNotasSyncProgress = {
  total_cloud_notes: number
  completed_before_page: number
  returned_notes: number
  remaining_after_page: number
  returned_assets: number
  signed_assets: number
}

export type OfflineNotasUploadProgress = {
  total_cloud_notes_created_by_user: number
}

export type OfflineNotasSyncScope = 'own' | 'all'

export type OfflineNotasSyncPermissions = {
  role: string
  scope: OfflineNotasSyncScope
}

export type OfflineNotasSyncResponse = {
  success: true
  generated_at: string
  permissions: OfflineNotasSyncPermissions
  include_deleted: boolean
  since: string | null
  signed_url_expires_at: string | null
  pagination: OfflineNotasSyncPagination
  progress: {
    download: OfflineNotasSyncProgress
    upload: OfflineNotasUploadProgress
  }
  notas: OfflineNotaSyncItem[]
}
