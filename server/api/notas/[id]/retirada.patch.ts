import { randomUUID } from 'node:crypto'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type {
  NotaRegistrarRetiradaRequest,
  NotaProduto,
  NotaRetiradaHistoricoItem,
  NotaRetiradaStatus,
} from '../../../../shared/types/NotasRetirada'
import { encontrarProdutoEstoque } from '../../../services/estoque/match-produtos'

const storageBucket = 'notas-retirada'

type ProdutoNormalizadoRetirada = {
  index: number
  item: NotaProduto
  nome: string
  quantidadeTotal: number
  quantidadeRetiradaAtual: number
  retiradaSolicitada: number
  idProdutoEstoque: number | null
}

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
    .select('id, owner_user_id, produtos, status_retirada, historico_retiradas')
    .eq('id', id)
    .single()

  if (notaError || !notaAtual) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nota não encontrada.',
    })
  }

  const retiradaMap = new Map<string, number>()

  for (const item of body.produtos_retirada) {
    const nome = String(item?.nome || '').trim().toLowerCase()
    if (!nome) {
      continue
    }

    const quantidade = Math.max(0, toNumber(item?.quantidade_retirada) ?? 0)
    const acumulada = retiradaMap.get(nome) ?? 0
    retiradaMap.set(nome, acumulada + quantidade)
  }

  const produtosNormalizados: ProdutoNormalizadoRetirada[] = Array.isArray(notaAtual.produtos)
    ? notaAtual.produtos
      .map((item: NotaProduto, index: number) => {
        const nome = String(item?.nome || '').trim()
        if (!nome) {
          return null
        }

        const quantidadeTotal = Math.max(0, toNumber(item?.quantidade) ?? 1)
        const quantidadeRetiradaAtual = Math.max(0, Math.min(quantidadeTotal, toNumber(item?.quantidade_retirada) ?? 0))
        const key = nome.toLowerCase()
        const retiradaInformada = retiradaMap.get(key) ?? 0
        const retiradaSolicitada = Math.max(0, Math.min(quantidadeTotal - quantidadeRetiradaAtual, retiradaInformada))
        const idProdutoRaw = toNumber(item?.id_produto_estoque)
        const idProdutoEstoque = idProdutoRaw !== undefined ? Math.trunc(idProdutoRaw) : null

        return {
          index,
          item,
          nome,
          quantidadeTotal,
          quantidadeRetiradaAtual,
          retiradaSolicitada,
          idProdutoEstoque,
        }
      })
      .filter((item: ProdutoNormalizadoRetirada | null): item is ProdutoNormalizadoRetirada => item !== null)
    : []

  const retiradasEfetivas = new Map<number, { quantidade: number; quantidade_solicitada: number }>()

  for (const produto of produtosNormalizados) {
    if (produto.retiradaSolicitada <= 0) {
      continue
    }

    let retiradaEfetiva = produto.retiradaSolicitada
    let idProdutoEstoque = produto.idProdutoEstoque

    if (idProdutoEstoque === null) {
      const match = await encontrarProdutoEstoque(client as any, produto.nome)
      idProdutoEstoque = match?.id_produto_estoque ?? null
    }

    if (idProdutoEstoque !== null) {
      const { data: baixaData, error: baixaError } = await (client as any)
        .rpc('baixar_estoque_produto', {
          p_id_produto: idProdutoEstoque,
          p_quantidade_solicitada: produto.retiradaSolicitada,
        })

      if (baixaError) {
        console.error('[api/notas/:id/retirada] stock rpc error:', baixaError.message)
        throw createError({
          statusCode: 500,
          statusMessage: 'Não foi possível baixar o estoque dos produtos retirados.',
        })
      }

      const primeiraLinha = Array.isArray(baixaData) ? baixaData[0] : null
      retiradaEfetiva = Math.max(0, Math.min(
        produto.retiradaSolicitada,
        toNumber(primeiraLinha?.quantidade_retirada) ?? 0,
      ))
    }

    retiradasEfetivas.set(produto.index, {
      quantidade: retiradaEfetiva,
      quantidade_solicitada: produto.retiradaSolicitada,
    })
  }

  const produtosAtualizados: NotaProduto[] = produtosNormalizados.map((produto) => {
    const retiradaEfetiva = retiradasEfetivas.get(produto.index)?.quantidade ?? 0
    const quantidadeRetiradaAtualizada = Math.max(
      0,
      Math.min(produto.quantidadeTotal, produto.quantidadeRetiradaAtual + retiradaEfetiva),
    )

    return {
      ...produto.item,
      nome: produto.nome,
      quantidade: produto.quantidadeTotal,
      quantidade_retirada: quantidadeRetiradaAtualizada,
    }
  })

  if (produtosAtualizados.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A nota não possui produtos válidos para retirada.',
    })
  }

  const totalItens = produtosAtualizados.length
  const itensRetirados = produtosAtualizados.filter(item => (item.quantidade_retirada ?? 0) > 0).length
  const itensCompletos = produtosAtualizados.filter(item => (item.quantidade_retirada ?? 0) >= (item.quantidade ?? 1)).length

  const statusAnterior = (notaAtual.status_retirada || null) as NotaRetiradaStatus | null
  const statusRetirada: NotaRetiradaStatus = itensCompletos === totalItens
    ? 'retirada'
    : itensRetirados > 0
      ? 'parcial'
      : 'pendente'

  const historicoAtual = Array.isArray(notaAtual.historico_retiradas)
    ? notaAtual.historico_retiradas
    : []

  const comprovanteRetiradaUrl = await uploadRetiradaPhoto(client as any, authUid, body.foto_cliente_retirada_data_url)

  const { data: profile } = await (client as any)
    .from('profiles')
    .select('nome, email')
    .eq('auth_uid', authUid)
    .maybeSingle()

  const responsavelNome = String(profile?.nome || profile?.email || '').trim() || authUid

  const eventoHistorico: NotaRetiradaHistoricoItem = {
    data: new Date().toISOString(),
    responsavel_id: authUid,
    responsavel_nome: responsavelNome,
    fotos: comprovanteRetiradaUrl ? [comprovanteRetiradaUrl] : [],
    itens_retirados: produtosNormalizados
      .map(produto => ({
        index: produto.index,
        quantidade: retiradasEfetivas.get(produto.index)?.quantidade ?? 0,
        quantidade_solicitada: retiradasEfetivas.get(produto.index)?.quantidade_solicitada ?? 0,
      }))
      .filter(item => item.quantidade > 0),
    observacoes: body.observacoes ?? null,
    // Campos legados mantidos para compatibilidade de consumidores antigos
    status_anterior: statusAnterior,
    status_novo: statusRetirada,
    usuario_id: authUid,
  }

  const payload: Record<string, unknown> = {
    produtos: produtosAtualizados,
    status_retirada: statusRetirada,
    comprovante_retirada_url: comprovanteRetiradaUrl,
    retirada_confirmada_por: authUid,
    data_retirada: statusRetirada === 'pendente' ? null : new Date().toISOString(),
    historico_retiradas: [...historicoAtual, eventoHistorico],
  }

  if (body.observacoes !== undefined) {
    payload.observacoes = body.observacoes
  }

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .update(payload)
    .eq('id', id)
    .select('id, status_retirada, data_retirada, comprovante_retirada_url, historico_retiradas, atualizado_em')
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
