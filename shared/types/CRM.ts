export type CrmContato = {
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

export type CrmContatoListResponse = {
  success: boolean
  contatos: CrmContato[]
}

export type CrmContatoUpsertRequest = {
  contato_id?: string
  nome: string
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

export type CrmContatoUpsertResponse = {
  success: boolean
  contato: CrmContato
}
