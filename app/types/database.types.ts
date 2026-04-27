type NotaRetiradaProduto = {
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

type NotaRetiradaHistoricoItem = {
  data: string
  responsavel_id: string
  responsavel_nome?: string | null
  fotos?: string[]
  itens_retirados?: Array<{
    index: number
    quantidade: number
    quantidade_solicitada?: number
  }>
  observacoes?: string | null
  status_anterior?: 'pendente' | 'parcial' | 'retirada' | 'cancelada' | null
  status_novo?: 'pendente' | 'parcial' | 'retirada' | 'cancelada'
  usuario_id?: string
}

export type Database = {
  public: {
    Tables: {
      notas_retirada: {
        Row: {
          id: string
          owner_user_id: string
          foto_url: string | null
          foto_cliente_url: string | null
          contato_id: string | null
          nome_cliente: string
          documento_cliente: string | null
          telefone_cliente: string | null
          numero_nota: string
          serie_nota: string
          chave_nfe: string | null
          data_compra: string
          data_prevista_retirada: string | null
          produtos: NotaRetiradaProduto[]
          valor_total: number | null
          desconto_total: number
          observacoes: string | null
          status_retirada: 'pendente' | 'parcial' | 'retirada' | 'cancelada'
          data_retirada: string | null
          retirada_confirmada_por: string | null
          comprovante_retirada_url: string | null
          criado_em: string
          atualizado_em: string
          historico_retiradas: NotaRetiradaHistoricoItem[] | null
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          owner_user_id: string
          foto_url?: string | null
          foto_cliente_url?: string | null
          contato_id?: string | null
          nome_cliente: string
          documento_cliente?: string | null
          telefone_cliente?: string | null
          numero_nota: string
          serie_nota?: string
          chave_nfe?: string | null
          data_compra: string
          data_prevista_retirada?: string | null
          produtos: NotaRetiradaProduto[]
          valor_total?: number | null
          desconto_total?: number
          observacoes?: string | null
          status_retirada?: 'pendente' | 'parcial' | 'retirada' | 'cancelada'
          data_retirada?: string | null
          retirada_confirmada_por?: string | null
          comprovante_retirada_url?: string | null
          criado_em?: string
          atualizado_em?: string
          historico_retiradas?: NotaRetiradaHistoricoItem[] | null
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          owner_user_id?: string
          foto_url?: string | null
          foto_cliente_url?: string | null
          contato_id?: string | null
          nome_cliente?: string
          documento_cliente?: string | null
          telefone_cliente?: string | null
          numero_nota?: string
          serie_nota?: string
          chave_nfe?: string | null
          data_compra?: string
          data_prevista_retirada?: string | null
          produtos?: NotaRetiradaProduto[]
          valor_total?: number | null
          desconto_total?: number
          observacoes?: string | null
          status_retirada?: 'pendente' | 'parcial' | 'retirada' | 'cancelada'
          data_retirada?: string | null
          retirada_confirmada_por?: string | null
          comprovante_retirada_url?: string | null
          criado_em?: string
          atualizado_em?: string
          historico_retiradas?: NotaRetiradaHistoricoItem[] | null
          deleted_at?: string | null
          deleted_by?: string | null
        }
      }
      notas_historico_edicao: {
        Row: {
          id: string
          nota_id: string
          user_id: string | null
          created_at: string | null
          dados_anteriores: unknown | null
          dados_novos: unknown | null
        }
        Insert: {
          id?: string
          nota_id: string
          user_id?: string | null
          created_at?: string | null
          dados_anteriores?: unknown | null
          dados_novos?: unknown | null
        }
        Update: {
          id?: string
          nota_id?: string
          user_id?: string | null
          created_at?: string | null
          dados_anteriores?: unknown | null
          dados_novos?: unknown | null
        }
      }
      crm_zincao: {
        Row: {
          id: number
          created_at: string
          contato_id: string
          nome: string | null
          cidade: string | null
          email: string | null
          data_nascimento: string | null
          sentimento: string | null
          urgencia: string | null
          resumo_perfil: string | null
          interesses: unknown | null
          objeccoes: unknown | null
          nome_social: string | null
          fase_obra: string | null
          compras_cliente: unknown | null
        }
        Insert: {
          id?: number
          created_at?: string
          contato_id: string
          nome?: string | null
          cidade?: string | null
          email?: string | null
          data_nascimento?: string | null
          sentimento?: string | null
          urgencia?: string | null
          resumo_perfil?: string | null
          interesses?: unknown | null
          objeccoes?: unknown | null
          nome_social?: string | null
          fase_obra?: string | null
          compras_cliente?: unknown | null
        }
        Update: {
          id?: number
          created_at?: string
          contato_id?: string
          nome?: string | null
          cidade?: string | null
          email?: string | null
          data_nascimento?: string | null
          sentimento?: string | null
          urgencia?: string | null
          resumo_perfil?: string | null
          interesses?: unknown | null
          objeccoes?: unknown | null
          nome_social?: string | null
          fase_obra?: string | null
          compras_cliente?: unknown | null
        }
      }
      bd_estoque_geral: {
        Row: {
          IDPRODUTO: number
          DESCRICAO: string
          EMBALAGEMSAIDA: string
          VALPRECOVAREJO: string | null
          TIPOPRODUTO: string | null
          QUANTIDADEESTOQUE: number
          CRIADOEM: string
          ATUALIZADOEM: string
          IDPRODUTOPAI: number | null
          FATORCONVERSAO: number | null
        }
        Insert: {
          IDPRODUTO?: number
          DESCRICAO: string
          EMBALAGEMSAIDA: string
          VALPRECOVAREJO?: string | null
          TIPOPRODUTO?: string | null
          QUANTIDADEESTOQUE?: number
          CRIADOEM?: string
          ATUALIZADOEM?: string
          IDPRODUTOPAI?: number | null
          FATORCONVERSAO?: number | null
        }
        Update: {
          IDPRODUTO?: number
          DESCRICAO?: string
          EMBALAGEMSAIDA?: string
          VALPRECOVAREJO?: string | null
          TIPOPRODUTO?: string | null
          QUANTIDADEESTOQUE?: number
          CRIADOEM?: string
          ATUALIZADOEM?: string
          IDPRODUTOPAI?: number | null
          FATORCONVERSAO?: number | null
        }
      }
      profiles: {
        Row: {
          id: string
          auth_uid: string
          nome: string | null
          email: string | null
          role: string | null
          workspaces: string[] | null
          ultimo_login: string | null
          deleted_at: string | null
          updated_at: string | null
          deleted_by: string | null
          updated_by: string | null
          foto_perfil: string | null
        }
        Insert: {
          id?: string
          auth_uid: string
          nome?: string | null
          email?: string | null
          role?: string | null
          workspaces?: string[] | null
          ultimo_login?: string | null
          deleted_at?: string | null
          updated_at?: string | null
          deleted_by?: string | null
          updated_by?: string | null
          foto_perfil?: string | null
        }
        Update: {
          id?: string
          auth_uid?: string
          nome?: string | null
          email?: string | null
          role?: string | null
          workspaces?: string[] | null
          ultimo_login?: string | null
          deleted_at?: string | null
          updated_at?: string | null
          deleted_by?: string | null
          updated_by?: string | null
          foto_perfil?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type NotaRetiradaRow = Database['public']['Tables']['notas_retirada']['Row']
export type NotaRetiradaInsert = Database['public']['Tables']['notas_retirada']['Insert']
export type NotaRetiradaUpdate = Database['public']['Tables']['notas_retirada']['Update']
export type EstoqueProdutoRow = Database['public']['Tables']['bd_estoque_geral']['Row']
export type EstoqueProdutoInsert = Database['public']['Tables']['bd_estoque_geral']['Insert']
export type EstoqueProdutoUpdate = Database['public']['Tables']['bd_estoque_geral']['Update']
