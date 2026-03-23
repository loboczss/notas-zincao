import { randomUUID } from 'node:crypto'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { CrmContatoUpsertRequest } from '../../../shared/types/CRM'

const createContatoId = () => `crm-${Date.now()}-${randomUUID().slice(0, 8)}`

export const crmUpsertPostHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody<CrmContatoUpsertRequest>(event)
  const nome = String(body?.nome || '').trim()
  const contatoId = String(body?.contato_id || '').trim()

  if (!nome) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nome é obrigatório para salvar contato no CRM.',
    })
  }

  const client = await serverSupabaseClient(event)

  const contatoIdFinal = contatoId || createContatoId()

  const { data: existing, error: existingError } = await (client as any)
    .from('crm_zincao')
    .select('id, created_at, contato_id, nome, cidade, email, data_nascimento, sentimento, urgencia, resumo_perfil, interesses, objeccoes, nome_social, fase_obra, compras_cliente')
    .eq('contato_id', contatoIdFinal)
    .maybeSingle()

  if (existingError) {
    console.error('[api/crm/upsert] existing error:', existingError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível validar o contato no CRM.',
    })
  }

  const payload = {
    contato_id: contatoIdFinal,
    nome,
    ...(body?.cidade !== undefined ? { cidade: body.cidade } : {}),
    ...(body?.email !== undefined ? { email: body.email } : {}),
    ...(body?.data_nascimento !== undefined ? { data_nascimento: body.data_nascimento } : {}),
    ...(body?.sentimento !== undefined ? { sentimento: body.sentimento } : {}),
    ...(body?.urgencia !== undefined ? { urgencia: body.urgencia } : {}),
    ...(body?.resumo_perfil !== undefined ? { resumo_perfil: body.resumo_perfil } : {}),
    ...(body?.interesses !== undefined ? { interesses: body.interesses } : {}),
    ...(body?.objeccoes !== undefined ? { objeccoes: body.objeccoes } : {}),
    ...(body?.nome_social !== undefined ? { nome_social: body.nome_social } : {}),
    ...(body?.fase_obra !== undefined ? { fase_obra: body.fase_obra } : {}),
    ...(body?.compras_cliente !== undefined ? { compras_cliente: body.compras_cliente } : {}),
  }

  const request = existing
    ? (client as any)
      .from('crm_zincao')
      .update(payload)
      .eq('contato_id', contatoIdFinal)
    : (client as any)
      .from('crm_zincao')
      .insert(payload)

  const { data, error } = await request
    .select('id, created_at, contato_id, nome, cidade, email, data_nascimento, sentimento, urgencia, resumo_perfil, interesses, objeccoes, nome_social, fase_obra, compras_cliente')
    .single()

  if (error || !data) {
    console.error('[api/crm/upsert] save error:', error?.message)

    if (error?.code === '23505') {
      throw createError({
        statusCode: 409,
        statusMessage: 'contato_id já existe no CRM.',
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível salvar contato no CRM.',
    })
  }

  return {
    success: true,
    contato: data,
  }
})

export default crmUpsertPostHandler
