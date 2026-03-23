import { randomUUID } from 'node:crypto'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { NotaRegistrarRetiradaRequest, NotaProduto } from '../../../../shared/types/NotasRetirada'

const storageBucket = 'notas-retirada'

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) {
      return undefined
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

const parseImageDataUrl = (value: string) => {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)

  if (!match) {
    return null
  }

  const mimeType = match[1] || ''
  const base64Content = match[2] || ''

  if (!mimeType || !base64Content) {
    return null
  }

  return { mimeType, base64Content }
}

const getExtensionFromMime = (mimeType: string) => {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/heic':
      return 'heic'
    default:
      return 'bin'
  }
}

const uploadRetiradaPhoto = async (client: any, ownerUserId: string, dataUrl: string) => {
  const parsed = parseImageDataUrl(dataUrl)

  if (!parsed) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Foto da retirada inválida.',
    })
  }

  const extension = getExtensionFromMime(parsed.mimeType)
  const path = `${ownerUserId}/retirada/${Date.now()}-${randomUUID()}.${extension}`
  const fileBuffer = Buffer.from(parsed.base64Content, 'base64')

  const { error: uploadError } = await client.storage
    .from(storageBucket)
    .upload(path, fileBuffer, {
      contentType: parsed.mimeType,
      upsert: false,
    })

  if (uploadError) {
    console.error('[api/notas/:id/retirada] upload error:', uploadError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível salvar a foto da retirada.',
    })
  }

  const { data } = client.storage.from(storageBucket).getPublicUrl(path)
  return data?.publicUrl || null
}

export const notasRetiradaPatchHandler = defineEventHandler(async (event) => {
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

  const body = await readBody<NotaRegistrarRetiradaRequest>(event)

  if (!body?.foto_cliente_retirada_data_url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Foto do cliente na retirada é obrigatória.',
    })
  }

  if (!Array.isArray(body.produtos_retirada) || body.produtos_retirada.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Informe os produtos retirados.',
    })
  }

  const client = await serverSupabaseClient(event)

  const { data: notaAtual, error: notaError } = await (client as any)
    .from('notas_retirada')
    .select('id, owner_user_id, produtos')
    .eq('id', id)
    .eq('owner_user_id', authUid)
    .single()

  if (notaError || !notaAtual) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nota não encontrada.',
    })
  }

  const retiradaMap = new Map(
    body.produtos_retirada
      .map(item => [String(item?.nome || '').trim().toLowerCase(), toNumber(item?.quantidade_retirada) ?? 0]),
  )

  const produtosAtualizados: NotaProduto[] = Array.isArray(notaAtual.produtos)
    ? notaAtual.produtos
      .map((item: NotaProduto) => {
        const nome = String(item?.nome || '').trim()
        if (!nome) {
          return null
        }

        const quantidadeTotal = toNumber(item?.quantidade) ?? 1
        const key = nome.toLowerCase()
        const retiradaInformada = retiradaMap.get(key) ?? 0
        const retiradaNormalizada = Math.max(0, Math.min(quantidadeTotal, retiradaInformada))

        return {
          ...item,
          nome,
          quantidade: quantidadeTotal,
          quantidade_retirada: retiradaNormalizada,
        }
      })
      .filter((item: NotaProduto | null): item is NotaProduto => item !== null)
    : []

  if (produtosAtualizados.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A nota não possui produtos válidos para retirada.',
    })
  }

  const totalItens = produtosAtualizados.length
  const itensRetirados = produtosAtualizados.filter(item => (item.quantidade_retirada ?? 0) > 0).length
  const itensCompletos = produtosAtualizados.filter(item => (item.quantidade_retirada ?? 0) >= (item.quantidade ?? 1)).length

  const statusRetirada = itensCompletos === totalItens
    ? 'retirada'
    : itensRetirados > 0
      ? 'parcial'
      : 'pendente'

  const comprovanteRetiradaUrl = await uploadRetiradaPhoto(client as any, authUid, body.foto_cliente_retirada_data_url)

  const payload: Record<string, unknown> = {
    produtos: produtosAtualizados,
    status_retirada: statusRetirada,
    comprovante_retirada_url: comprovanteRetiradaUrl,
    retirada_confirmada_por: authUid,
    data_retirada: statusRetirada === 'pendente' ? null : new Date().toISOString(),
  }

  if (body.observacoes !== undefined) {
    payload.observacoes = body.observacoes
  }

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .update(payload)
    .eq('id', id)
    .eq('owner_user_id', authUid)
    .select('id, status_retirada, data_retirada, comprovante_retirada_url, atualizado_em')
    .single()

  if (error || !data) {
    console.error('[api/notas/:id/retirada] update error:', error?.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível registrar a retirada.',
    })
  }

  return {
    success: true,
    nota: data,
  }
})

export default notasRetiradaPatchHandler
