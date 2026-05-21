import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertActiveProfileRole, getAuthUidOrThrow } from '../../../utils/permissions'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const NOTA_AUDIT_SELECT = [
  'id',
  'owner_user_id',
  'contato_id',
  'nome_cliente',
  'documento_cliente',
  'telefone_cliente',
  'numero_nota',
  'serie_nota',
  'chave_nfe',
  'data_compra',
  'data_prevista_retirada',
  'produtos',
  'valor_total',
  'desconto_total',
  'observacoes',
  'status_retirada',
  'data_retirada',
  'retirada_confirmada_por',
  'criado_em',
  'atualizado_em',
  'historico_retiradas',
  'deleted_at',
  'deleted_by',
].join(', ')

const normalizeNoteId = (rawId: string | undefined) => {
  const id = String(rawId || '').trim()

  if (!UUID_RE.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da nota invalido.',
    })
  }

  return id
}

const assertEmptyDeletePayload = (event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]) => {
  const contentLengthHeader = getRequestHeader(event, 'content-length')
  const transferEncoding = getRequestHeader(event, 'transfer-encoding')
  const contentLength = Number(contentLengthHeader || 0)

  if ((Number.isFinite(contentLength) && contentLength > 0) || transferEncoding) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A exclusao nao aceita payload.',
    })
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  assertEmptyDeletePayload(event)

  const authUid = getAuthUidOrThrow(user)
  const id = normalizeNoteId(getRouterParam(event, 'id'))

  const client = await serverSupabaseClient<Database>(event) as SupabaseClient<Database>
  await assertActiveProfileRole(
    client as any,
    authUid,
    ['admin'],
    'Apenas administradores podem excluir notas.',
  )

  const { data: notaAtual, error: notaError } = await (client as any)
    .from('notas_retirada')
    .select(NOTA_AUDIT_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (notaError) {
    console.error('[api/notas/delete] fetch error:', notaError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel preparar a exclusao da nota.',
    })
  }

  if (!notaAtual) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nota nao encontrada.',
    })
  }

  if (notaAtual.deleted_at) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Esta nota ja foi excluida.',
    })
  }

  const deletedAt = new Date().toISOString()
  const updateData: Database['public']['Tables']['notas_retirada']['Update'] = {
    deleted_at: deletedAt,
    deleted_by: authUid,
    atualizado_em: deletedAt,
  }

  const { data: deletedRow, error } = await (client as any)
    .from('notas_retirada')
    .update(updateData)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[api/notas/delete] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel excluir a nota com seguranca.',
    })
  }

  if (!deletedRow) {
    throw createError({
      statusCode: 409,
      statusMessage: 'A nota ja foi alterada por outra sessao.',
    })
  }

  const { error: auditError } = await (client as any)
    .from('notas_historico_edicao')
    .insert({
      nota_id: id,
      user_id: authUid,
      dados_anteriores: notaAtual,
      dados_novos: {
        acao: 'soft_delete',
        deleted_at: deletedAt,
        deleted_by: authUid,
      },
    })

  if (auditError) {
    console.error('[api/notas/delete] audit error:', auditError.message)
  }

  return {
    success: true,
    deletedId: id,
  }
})
