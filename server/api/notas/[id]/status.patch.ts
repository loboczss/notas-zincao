import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { NotaRetiradaStatusUpdateRequest } from '../../../../shared/types/NotasRetirada'

const allowedStatus = ['pendente', 'parcial', 'retirada', 'cancelada'] as const

export const notasStatusPatchHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const authUid = user.id || user.sub

  if (!authUid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authenticated user id not found.',
    })
  }

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nota id is required.',
    })
  }

  const body = await readBody<NotaRetiradaStatusUpdateRequest>(event)

  if (!body?.status_retirada || !allowedStatus.includes(body.status_retirada)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'status_retirada inválido.',
    })
  }

  const client = await serverSupabaseClient(event)

  const payload: Record<string, unknown> = {
    status_retirada: body.status_retirada,
  }

  if (body.observacoes !== undefined) {
    payload.observacoes = body.observacoes
  }

  if (body.data_retirada !== undefined) {
    payload.data_retirada = body.data_retirada
  }
  else if (body.status_retirada === 'pendente') {
    payload.data_retirada = null
  }
  else if (body.status_retirada === 'parcial' || body.status_retirada === 'retirada') {
    payload.data_retirada = new Date().toISOString()
  }

  if (body.retirada_confirmada_por !== undefined) {
    payload.retirada_confirmada_por = body.retirada_confirmada_por
  }

  if (body.comprovante_retirada_url !== undefined) {
    payload.comprovante_retirada_url = body.comprovante_retirada_url
  }

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .update(payload)
    .eq('id', id)
    .eq('owner_user_id', authUid)
    .select('id, status_retirada, data_retirada, atualizado_em')
    .single()

  if (error) {
    console.error('[api/notas/:id/status] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível atualizar o status da nota.',
    })
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nota não encontrada.',
    })
  }

  return {
    success: true,
    nota: data,
  }
})

export default notasStatusPatchHandler
