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
          produtos: {
            nome: string
            quantidade?: number
            valor_unitario?: number
            unidade?: string
          }[]
          valor_total: number | null
          observacoes: string | null
          status_retirada: 'pendente' | 'parcial' | 'retirada' | 'cancelada'
          data_retirada: string | null
          retirada_confirmada_por: string | null
          comprovante_retirada_url: string | null
          criado_em: string
          atualizado_em: string
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
          produtos: {
            nome: string
            quantidade?: number
            valor_unitario?: number
            unidade?: string
          }[]
          valor_total?: number | null
          observacoes?: string | null
          status_retirada?: 'pendente' | 'parcial' | 'retirada' | 'cancelada'
          data_retirada?: string | null
          retirada_confirmada_por?: string | null
          comprovante_retirada_url?: string | null
          criado_em?: string
          atualizado_em?: string
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
          produtos?: {
            nome: string
            quantidade?: number
            valor_unitario?: number
            unidade?: string
          }[]
          valor_total?: number | null
          observacoes?: string | null
          status_retirada?: 'pendente' | 'parcial' | 'retirada' | 'cancelada'
          data_retirada?: string | null
          retirada_confirmada_por?: string | null
          comprovante_retirada_url?: string | null
          criado_em?: string
          atualizado_em?: string
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
  }
}

export type NotaRetiradaRow = Database['public']['Tables']['notas_retirada']['Row']
export type NotaRetiradaInsert = Database['public']['Tables']['notas_retirada']['Insert']
export type NotaRetiradaUpdate = Database['public']['Tables']['notas_retirada']['Update']
