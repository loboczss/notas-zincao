import { randomUUID } from 'node:crypto'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type {
  NotaRegistrarRetiradaRequest,
  NotaProduto,
  NotaRetiradaHistoricoItem,
  NotaRetiradaStatus,
} from '../../../../shared/types/NotasRetirada'
import { getNotaRetiradaStatusFromProdutos } from '../../../../shared/utils/notas-retirada-status'
import { encontrarProdutoEstoque } from '../../../services/estoque/match-produtos'
import { assertActiveProfileRole } from '../../../utils/permissions'
import { NOTAS_RETIRADA_STORAGE_BUCKET, signNotaStorageUrls, uploadNotaImageObject } from '../../../utils/storage'

const storageBucket = NOTAS_RETIRADA_STORAGE_BUCKET

type ProdutoNormalizadoRetirada = {
  index: number
  item: NotaProduto
  nome: string
  quantidadeTotal: number
  quantidadeRetiradaAtual: number
  retiradaSolicitada: number
  idProdutoEstoque: number | null
}

type RetiradaEfetiva = {
  quantidade: number
  quantidade_solicitada: number
  id_produto_estoque: number | null
  id_produto_estoque_baixa: number | null
}

type ProdutoBdEstoque = {
  IDPRODUTO: number
  IDPRODUTOPAI: number | null
}

type ProdutoBaixaEstoque = {
  origem: 'bd_estoque_geral' | 'stock_integrin'
  idProdutoEstoque: number
  idProdutoBaixa: number
}

type ProdutoStockIntegrinMatch = {
  idproduto: number
  idsubproduto: number
  descrcomproduto: string
}

const RETIRADA_SEM_BAIXA_MESSAGE = 'Nenhum produto foi retirado. O estoque do produto pai vinculado esta zerado ou insuficiente para esta baixa.'
const TELHA_ZINCO_PRODUTO_PAI_ID = 10

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

const normalizeText = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const isTelhaZincoProduto = (nome: string) => {
  const normalized = normalizeText(nome)
  return /\btelhas?\b/.test(normalized) && normalized.includes('zinco')
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

  try {
    return await uploadNotaImageObject(client, path, fileBuffer, parsed.mimeType, storageBucket)
  }
  catch (uploadError) {
    console.error('[api/notas/:id/retirada] upload error:', uploadError instanceof Error ? uploadError.message : uploadError)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível salvar a foto da retirada.',
    })
  }
}

const getItensSolicitadosKey = (items: NonNullable<NotaRetiradaHistoricoItem['itens_solicitados']>) => {
  return JSON.stringify(
    items
      .map(item => ({
        index: Number(item.index),
        quantidade: Number(item.quantidade),
        id_produto_estoque_baixa: item.id_produto_estoque_baixa ?? null,
      }))
      .sort((a, b) => a.index - b.index),
  )
}

const throwRetiradaSemBaixa = () => {
  throw createError({
    statusCode: 409,
    statusMessage: RETIRADA_SEM_BAIXA_MESSAGE,
  })
}

const buscarProdutoBdEstoque = async (client: any, idProdutoEstoque: number) => {
  const { data, error } = await (client as any)
    .from('bd_estoque_geral')
    .select('IDPRODUTO, IDPRODUTOPAI')
    .eq('IDPRODUTO', idProdutoEstoque)
    .maybeSingle()

  if (error) {
    console.error('[api/notas/:id/retirada] stock product parent lookup error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel validar o produto pai no estoque.',
    })
  }

  return data as ProdutoBdEstoque | null
}

const toProdutoBaixaBdEstoque = (idProdutoEstoque: number, produto: ProdutoBdEstoque): ProdutoBaixaEstoque => {
  const parentId = toNumber(produto?.IDPRODUTOPAI)

  return {
    origem: 'bd_estoque_geral',
    idProdutoEstoque: Math.trunc(idProdutoEstoque),
    idProdutoBaixa: parentId !== undefined && parentId > 0
      ? Math.trunc(parentId)
      : idProdutoEstoque,
  }
}

const buscarProdutoStockIntegrinPorNome = async (
  client: any,
  idempresa: number,
  nome: string,
) => {
  const normalized = normalizeText(nome)
  if (!normalized || isTelhaZincoProduto(nome)) {
    return null
  }

  const primaryTerm = normalized.split(' ').slice(0, 4).join(' ')
  const { data, error } = await (client as any)
    .from('stock_integrin')
    .select('idproduto, idsubproduto, descrcomproduto')
    .eq('idempresa', idempresa)
    .eq('is_present', true)
    .neq('idproduto', TELHA_ZINCO_PRODUTO_PAI_ID)
    .neq('idsubproduto', TELHA_ZINCO_PRODUTO_PAI_ID)
    .ilike('descrcomproduto', `%${primaryTerm || normalized}%`)
    .order('qtdsaldodisponivel', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[api/notas/:id/retirada] stock integrin lookup error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel buscar o produto no Stock Integrin.',
    })
  }

  const candidates = ((data || []) as ProdutoStockIntegrinMatch[])
    .filter(candidate => !isTelhaZincoProduto(candidate.descrcomproduto))
    .map((candidate) => {
      const candidateText = normalizeText(candidate.descrcomproduto)
      const queryTokens = normalized.split(' ')
      const score = candidateText === normalized
        ? 1
        : queryTokens.filter(token => candidateText.includes(token)).length / Math.max(1, queryTokens.length)

      return { candidate, score }
    })
    .sort((a, b) => b.score - a.score)

  const bestMatch = candidates[0]
  if (!bestMatch || bestMatch.score < 0.65) {
    return null
  }

  return bestMatch.candidate
}

const resolveProdutoBaixaEstoque = async (
  client: any,
  produto: ProdutoNormalizadoRetirada,
  idempresa: number | null,
): Promise<ProdutoBaixaEstoque | null> => {
  if (produto.idProdutoEstoque === null) {
    if (!idempresa || idempresa <= 0) {
      return null
    }

    const matchIntegrin = await buscarProdutoStockIntegrinPorNome(client, idempresa, produto.nome)
    if (!matchIntegrin) {
      return null
    }

    return {
      origem: 'stock_integrin',
      idProdutoEstoque: Math.trunc(matchIntegrin.idproduto),
      idProdutoBaixa: Math.trunc(matchIntegrin.idproduto),
    }
  }

  const produtoBd = await buscarProdutoBdEstoque(client, produto.idProdutoEstoque)
  if (produtoBd) {
    return toProdutoBaixaBdEstoque(produto.idProdutoEstoque, produtoBd)
  }

  const matchBd = await encontrarProdutoEstoque(client as any, produto.nome)
  const matchBdId = toNumber(matchBd?.id_produto_estoque)
  if (matchBdId !== undefined && matchBdId > 0) {
    const produtoBdPorNome = await buscarProdutoBdEstoque(client, Math.trunc(matchBdId))
    if (produtoBdPorNome) {
      return toProdutoBaixaBdEstoque(Math.trunc(matchBdId), produtoBdPorNome)
    }
  }

  if (
    !idempresa
    || idempresa <= 0
    || produto.idProdutoEstoque === TELHA_ZINCO_PRODUTO_PAI_ID
    || isTelhaZincoProduto(produto.nome)
  ) {
    return null
  }

  return {
    origem: 'stock_integrin',
    idProdutoEstoque: produto.idProdutoEstoque,
    idProdutoBaixa: produto.idProdutoEstoque,
  }
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

  const requestId = typeof body.request_id === 'string' && body.request_id.trim()
    ? body.request_id.trim()
    : null

  console.info('[api/notas/:id/retirada] request received', {
    notaId: id,
    requestId,
    itemCount: body.produtos_retirada.length,
    hasObservacoes: typeof body.observacoes === 'string' && body.observacoes.trim().length > 0,
  })

  const client = await serverSupabaseClient(event)
  await assertActiveProfileRole(
    client as any,
    authUid,
    ['admin', 'colaborador'],
    'Somente administradores ou colaboradores podem registrar retirada.',
  )

  const retornarNotaAtual = async (motivo: string, duplicateRequestId?: string | null) => {
    const { data: notaIdempotente, error: idempotenteError } = await (client as any)
      .from('notas_retirada')
      .select('id, status_retirada, data_retirada, comprovante_retirada_url, historico_retiradas, atualizado_em')
      .eq('id', id)
      .single()

    if (idempotenteError || !notaIdempotente) {
      throw createError({
        statusCode: 500,
        statusMessage: `Falha ao recuperar a nota apos detectar retirada duplicada (${motivo}).`,
      })
    }

    const historicoIdempotente = Array.isArray(notaIdempotente.historico_retiradas)
      ? notaIdempotente.historico_retiradas as NotaRetiradaHistoricoItem[]
      : []
    const eventoDuplicado = duplicateRequestId
      ? historicoIdempotente.find(item => item?.request_id === duplicateRequestId)
      : null

    if (duplicateRequestId && !eventoDuplicado) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Esta retirada ja esta em processamento. Atualize a nota antes de tentar novamente.',
      })
    }

    if (eventoDuplicado?.retirada_efetuada === false || eventoDuplicado?.tipo === 'tentativa_sem_baixa') {
      throwRetiradaSemBaixa()
    }

    return {
      success: true,
      nota: await signNotaStorageUrls(client as any, notaIdempotente),
      idempotent: true as const,
    }
  }

  if (requestId) {
    const { error: idemInsertError } = await (client as any)
      .from('retirada_idempotency')
      .insert({
        request_id: requestId,
        nota_id: id,
        user_id: authUid,
      })

    if (idemInsertError) {
      const code = (idemInsertError as { code?: string }).code
      if (code === '23505') {
        console.info('[api/notas/:id/retirada] duplicate request_id rejected by idempotency table', {
          notaId: id,
          requestId,
        })
        return await retornarNotaAtual('idempotency_table', requestId)
      }

      if (code === '42P01') {
        console.warn('[api/notas/:id/retirada] retirada_idempotency table missing — apply migration 20260524_retirada_idempotency.sql')
      }
      else {
        console.warn('[api/notas/:id/retirada] idempotency insert failed (continuing without guard)', {
          requestId,
          code,
          message: idemInsertError.message,
        })
      }
    }
  }

  const { data: notaAtual, error: notaError } = await (client as any)
    .from('notas_retirada')
    .select('id, owner_user_id, idempresa, produtos, status_retirada, historico_retiradas')
    .eq('id', id)
    .single()

  if (notaError || !notaAtual) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nota não encontrada.',
    })
  }

  if (requestId) {
    const historicoExistente = Array.isArray(notaAtual.historico_retiradas)
      ? notaAtual.historico_retiradas as NotaRetiradaHistoricoItem[]
      : []

    const jaProcessada = historicoExistente.some(item => item?.request_id === requestId)

    if (jaProcessada) {
      console.info('[api/notas/:id/retirada] duplicate request_id detected in historico, skipping', {
        notaId: id,
        requestId,
      })
      return await retornarNotaAtual('historico', requestId)
    }
  }

  const idEmpresaNota = toNumber(notaAtual.idempresa)
  const idempresa = idEmpresaNota !== undefined && idEmpresaNota > 0
    ? Math.trunc(idEmpresaNota)
    : null

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

  const retiradasEfetivas = new Map<number, RetiradaEfetiva>()

  for (const produto of produtosNormalizados) {
    if (produto.retiradaSolicitada <= 0) {
      continue
    }

    let retiradaEfetiva = 0
    let idProdutoEstoque = produto.idProdutoEstoque

    if (idProdutoEstoque === null) {
      const match = await encontrarProdutoEstoque(client as any, produto.nome)
      idProdutoEstoque = match?.id_produto_estoque ?? null
    }

    const produtoComIdResolvido: ProdutoNormalizadoRetirada = {
      ...produto,
      idProdutoEstoque,
    }
    const produtoBaixa = await resolveProdutoBaixaEstoque(client as any, produtoComIdResolvido, idempresa)

    if (produtoBaixa !== null) {
      const rpcName = produtoBaixa.origem === 'stock_integrin'
        ? 'baixar_stock_integrin_produto'
        : 'baixar_estoque_produto'
      const rpcParams = produtoBaixa.origem === 'stock_integrin'
        ? {
            p_idempresa: idempresa,
            p_id_produto: produtoBaixa.idProdutoBaixa,
            p_quantidade_solicitada: produto.retiradaSolicitada,
          }
        : {
            p_id_produto: produtoBaixa.idProdutoBaixa,
            p_quantidade_solicitada: produto.retiradaSolicitada,
          }

      const { data: baixaData, error: baixaError } = await (client as any)
        .rpc(rpcName, rpcParams)

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

      retiradasEfetivas.set(produto.index, {
        quantidade: retiradaEfetiva,
        quantidade_solicitada: produto.retiradaSolicitada,
        id_produto_estoque: produtoBaixa.idProdutoEstoque,
        id_produto_estoque_baixa: produtoBaixa.idProdutoBaixa,
      })
      continue
    }

    retiradasEfetivas.set(produto.index, {
      quantidade: retiradaEfetiva,
      quantidade_solicitada: produto.retiradaSolicitada,
      id_produto_estoque: idProdutoEstoque,
      id_produto_estoque_baixa: null,
    })
  }

  const produtosAtualizados: NotaProduto[] = produtosNormalizados.map((produto) => {
    const retirada = retiradasEfetivas.get(produto.index)
    const retiradaEfetiva = retirada?.quantidade ?? 0
    const quantidadeRetiradaAtualizada = Math.max(
      0,
      Math.min(produto.quantidadeTotal, produto.quantidadeRetiradaAtual + retiradaEfetiva),
    )
    const idProdutoEstoqueResolvido = retirada?.id_produto_estoque ?? produto.idProdutoEstoque

    return {
      ...produto.item,
      nome: produto.nome,
      quantidade: produto.quantidadeTotal,
      quantidade_retirada: quantidadeRetiradaAtualizada,
      ...(idProdutoEstoqueResolvido !== null ? { id_produto_estoque: idProdutoEstoqueResolvido } : {}),
    }
  })

  if (produtosAtualizados.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A nota não possui produtos válidos para retirada.',
    })
  }

  const statusAnterior = (notaAtual.status_retirada || null) as NotaRetiradaStatus | null
  const statusRetirada = getNotaRetiradaStatusFromProdutos(produtosAtualizados)

  const historicoAtual = Array.isArray(notaAtual.historico_retiradas)
    ? notaAtual.historico_retiradas
    : []

  const { data: profile } = await (client as any)
    .from('profiles')
    .select('nome, email')
    .eq('auth_uid', authUid)
    .maybeSingle()

  const responsavelNome = String(profile?.nome || profile?.email || '').trim() || authUid
  const itensSolicitados = produtosNormalizados
    .filter(produto => produto.retiradaSolicitada > 0)
    .map((produto) => {
      const retirada = retiradasEfetivas.get(produto.index)

      return {
        index: produto.index,
        quantidade: produto.retiradaSolicitada,
        id_produto_estoque: retirada?.id_produto_estoque ?? produto.idProdutoEstoque,
        id_produto_estoque_baixa: retirada?.id_produto_estoque_baixa ?? null,
      }
    })

  const totalRetiradoNestaSolicitacao = Array.from(retiradasEfetivas.values())
    .reduce((total, retirada) => total + Math.max(0, retirada.quantidade), 0)

  if (totalRetiradoNestaSolicitacao <= 0) {
    const itensSolicitadosKey = getItensSolicitadosKey(itensSolicitados)
    const tentativaSemBaixaJaRegistrada = historicoAtual.some((item: NotaRetiradaHistoricoItem) => {
      if (item?.retirada_efetuada !== false && item?.tipo !== 'tentativa_sem_baixa') return false
      const itens = Array.isArray(item.itens_solicitados) ? item.itens_solicitados : []
      return getItensSolicitadosKey(itens) === itensSolicitadosKey
    })

    if (!tentativaSemBaixaJaRegistrada) {
      const comprovanteRetiradaUrl = await uploadRetiradaPhoto(client as any, authUid, body.foto_cliente_retirada_data_url)
      const tentativaHistorico: NotaRetiradaHistoricoItem = {
        data: new Date().toISOString(),
        responsavel_id: authUid,
        responsavel_nome: responsavelNome,
        tipo: 'tentativa_sem_baixa',
        retirada_efetuada: false,
        motivo_falha: RETIRADA_SEM_BAIXA_MESSAGE,
        fotos: comprovanteRetiradaUrl ? [comprovanteRetiradaUrl] : [],
        itens_solicitados: itensSolicitados,
        itens_retirados: [],
        observacoes: body.observacoes ?? null,
        request_id: requestId,
        status_anterior: statusAnterior,
        status_novo: statusAnterior || 'pendente',
        usuario_id: authUid,
      }

      const { error: tentativaError } = await (client as any)
        .from('notas_retirada')
        .update({
          historico_retiradas: [...historicoAtual, tentativaHistorico],
        })
        .eq('id', id)

      if (tentativaError) {
        console.error('[api/notas/:id/retirada] failed attempt history update error:', tentativaError.message)
      }
    }

    throwRetiradaSemBaixa()
  }

  const comprovanteRetiradaUrl = await uploadRetiradaPhoto(client as any, authUid, body.foto_cliente_retirada_data_url)

  const eventoHistorico: NotaRetiradaHistoricoItem = {
    data: new Date().toISOString(),
    responsavel_id: authUid,
    responsavel_nome: responsavelNome,
    tipo: 'retirada',
    retirada_efetuada: true,
    fotos: comprovanteRetiradaUrl ? [comprovanteRetiradaUrl] : [],
    itens_retirados: produtosNormalizados
      .map((produto) => {
        const retirada = retiradasEfetivas.get(produto.index)

        return {
          index: produto.index,
          quantidade: retirada?.quantidade ?? 0,
          quantidade_solicitada: retirada?.quantidade_solicitada ?? 0,
          id_produto_estoque: retirada?.id_produto_estoque ?? produto.idProdutoEstoque,
          id_produto_estoque_baixa: retirada?.id_produto_estoque_baixa ?? null,
        }
      })
      .filter(item => item.quantidade > 0),
    itens_solicitados: itensSolicitados,
    observacoes: body.observacoes ?? null,
    request_id: requestId,
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
    nota: await signNotaStorageUrls(client as any, data),
  }
})

export default notasRetiradaPatchHandler
