import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type {
  NotaRetiradaHistoricoItem,
  NotaRetiradaStatus,
  NotaRetiradaStatusUpdateRequest,
} from '../../../../shared/types/NotasRetirada'

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

  const { data: notaAtual, error: notaAtualError } = await (client as any)
    .from('notas_retirada')
    .select('id, owner_user_id, status_retirada, historico_retiradas')
    .eq('id', id)
    .single()

  if (notaAtualError || !notaAtual) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nota não encontrada.',
    })
  }

  const payload: Record<string, unknown> = {
    status_retirada: body.status_retirada,
  }

  if (body.observacoes !== undefined) {
    payload.observacoes = body.observacoes
  }

  if (body.data_retirada !== undefined) {
    payload.data_retirada = body.data_retirada
  }
  else if (body.status_retirada === 'pendente' || body.status_retirada === 'cancelada') {
    payload.data_retirada = null
  }
  else if (body.status_retirada === 'parcial' || body.status_retirada === 'retirada') {
    payload.data_retirada = new Date().toISOString()
  }

  if (body.retirada_confirmada_por !== undefined) {
    payload.retirada_confirmada_por = body.retirada_confirmada_por
  }
  else if (body.status_retirada === 'parcial' || body.status_retirada === 'retirada') {
    payload.retirada_confirmada_por = authUid
  }
  else if (body.status_retirada === 'pendente' || body.status_retirada === 'cancelada') {
    payload.retirada_confirmada_por = null
  }

  if (body.comprovante_retirada_url !== undefined) {
    payload.comprovante_retirada_url = body.comprovante_retirada_url
  }
  else if (body.status_retirada === 'pendente' || body.status_retirada === 'cancelada') {
    payload.comprovante_retirada_url = null
  }

  const historicoAtual = Array.isArray(notaAtual.historico_retiradas)
    ? notaAtual.historico_retiradas
    : []

  const { data: profile } = await (client as any)
    .from('profiles')
    .select('nome, email')
    .eq('auth_uid', authUid)
    .maybeSingle()

  const responsavelNome = String(profile?.nome || profile?.email || '').trim() || authUid
  const fotoHistorico = String(
    body.comprovante_retirada_url
    ?? payload.comprovante_retirada_url
    ?? '',
  ).trim()

  const eventoHistorico: NotaRetiradaHistoricoItem = {
    data: new Date().toISOString(),
    responsavel_id: authUid,
    responsavel_nome: responsavelNome,
    fotos: fotoHistorico ? [fotoHistorico] : [],
    itens_retirados: [],
    status_anterior: (notaAtual.status_retirada || null) as NotaRetiradaStatus | null,
    status_novo: body.status_retirada,
    usuario_id: authUid,
    observacoes: body.observacoes ?? null,
  }
  payload.historico_retiradas = [...historicoAtual, eventoHistorico]

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .update(payload)
    .eq('id', id)
    .select('id, status_retirada, data_retirada, historico_retiradas, atualizado_em')
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
