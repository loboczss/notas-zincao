import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { randomUUID } from 'node:crypto'
import type { NotaRetiradaDraft } from '../../../shared/types/NotasRetirada'
import { vincularProdutosAoEstoque } from '../../services/estoque/match-produtos'
import { assertCanCreateNota, getAuthUidOrThrow } from '../../utils/permissions'
import { NOTAS_RETIRADA_STORAGE_BUCKET, signNotaStorageUrls } from '../../utils/storage'

const requiredFields = ['nome_cliente', 'numero_nota', 'data_compra', 'produtos'] as const
const storageBucket = NOTAS_RETIRADA_STORAGE_BUCKET
const allowedStatus = ['pendente', 'parcial', 'retirada', 'cancelada'] as const
const notaReturnSelect = [
  'id',
  'contato_id',
  'owner_user_id',
  'nome_cliente',
  'documento_cliente',
  'telefone_cliente',
  'numero_nota',
  'serie_nota',
  'chave_nfe',
  'data_compra',
  'data_prevista_retirada',
  'data_retirada',
  'valor_total',
  'desconto_total',
  'observacoes',
  'status_retirada',
  'criado_em',
  'atualizado_em',
  'retirada_confirmada_por',
  'produtos',
  'foto_url',
  'foto_cliente_url',
  'comprovante_retirada_url',
  'historico_retiradas',
].join(', ')

const badRequest = (statusMessage: string) => createError({ statusCode: 400, statusMessage })

const isHttpError = (error: unknown) => Boolean(error && typeof error === 'object' && 'statusCode' in error)

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return undefined

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

const toInteger = (value: unknown) => {
  const parsed = toNumber(value)
  return parsed === undefined ? undefined : Math.trunc(parsed)
}

const normalizeDigits = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) return null

  const digits = raw.replace(/\D/g, '')
  return digits || null
}

const normalizeProdutos = (produtos: NotaRetiradaDraft['produtos']) => {
  if (!Array.isArray(produtos)) return []

  return produtos
    .map((item) => {
      const nome = String(item?.nome || '').trim()
      if (!nome) return null

      const quantidade = toNumber(item?.quantidade)
      const valorUnitario = toNumber(item?.valor_unitario)
      const valorTotal = toNumber(item?.valor_total)
      const unidade = String(item?.unidade || item?.tipo_unidade || '').trim()
      const embalagem = String(item?.embalagem || '').trim()
      const tipoUnidade = String(item?.tipo_unidade || unidade || '').trim()
      const confidence = toNumber(item?.confidence)
      const idProdutoEstoque = toInteger(item?.id_produto_estoque)
      const tipoProdutoRaw = item?.tipo_produto
      const tipoProduto = typeof tipoProdutoRaw === 'string'
        ? tipoProdutoRaw.trim() || null
        : null

      return {
        nome,
        ...(quantidade !== undefined ? { quantidade } : {}),
        ...(valorUnitario !== undefined ? { valor_unitario: valorUnitario } : {}),
        ...(valorTotal !== undefined ? { valor_total: valorTotal } : {}),
        ...(unidade ? { unidade } : {}),
        ...(tipoUnidade ? { tipo_unidade: tipoUnidade } : {}),
        ...(embalagem ? { embalagem } : {}),
        ...(confidence !== undefined ? { confidence } : {}),
        ...(idProdutoEstoque !== undefined ? { id_produto_estoque: idProdutoEstoque } : {}),
        ...(tipoProduto !== null ? { tipo_produto: tipoProduto } : {}),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

const normalizeDate = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch
    return `${yyyy}-${mm}-${dd}`
  }

  return raw
}

const isValidISODate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [yearRaw, monthRaw, dayRaw] = value.split('-').map(Number)
  const year = yearRaw ?? NaN
  const month = monthRaw ?? NaN
  const day = dayRaw ?? NaN

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false

  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day
}

const parseImageDataUrl = (value: string) => {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null

  const mimeType = match[1] || ''
  const base64Content = match[2] || ''
  if (!mimeType || !base64Content) return null

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

const mapSupabaseCreateError = (error: any) => {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  const lowerMessage = message.toLowerCase()

  if (code === '23505') {
    return createError({
      statusCode: 409,
      statusMessage: 'Essa nota (numero/serie) ja foi cadastrada.',
    })
  }

  if (code === '22007') return badRequest('Data da compra invalida.')

  if (code === '42501' || lowerMessage.includes('row-level security') || lowerMessage.includes('sem permissao')) {
    return createError({
      statusCode: 403,
      statusMessage: 'Sem permissao para cadastrar nota. O usuario precisa estar ativo como admin, colaborador ou vendedor.',
    })
  }

  if (code === '42703') {
    if (message.includes('foto_cliente_url')) {
      return createError({
        statusCode: 500,
        statusMessage: 'Banco desatualizado: aplique a migration da coluna foto_cliente_url.',
      })
    }

    if (message.includes('contato_id')) {
      return createError({
        statusCode: 500,
        statusMessage: 'Banco desatualizado: aplique a migration da coluna contato_id.',
      })
    }
  }

  if (code === '23503') return badRequest('Algum vinculo informado nao existe mais no banco.')

  return createError({
    statusCode: 500,
    statusMessage: 'Nao foi possivel salvar a nota. Tente novamente em instantes.',
  })
}

const uploadImageDataUrl = async (
  client: any,
  ownerUserId: string,
  type: 'cupom' | 'cliente',
  dataUrl: string,
) => {
  const parsed = parseImageDataUrl(dataUrl)
  if (!parsed) throw badRequest(`Imagem de ${type} invalida.`)

  const extension = getExtensionFromMime(parsed.mimeType)
  const path = `${ownerUserId}/${type}/${Date.now()}-${randomUUID()}.${extension}`
  const fileBuffer = Buffer.from(parsed.base64Content, 'base64')

  const { error: uploadError } = await (client as any).storage
    .from(storageBucket)
    .upload(path, fileBuffer, {
      contentType: parsed.mimeType,
      upsert: false,
    })

  if (uploadError) {
    console.error(`[api/notas/create] upload ${type} error:`, uploadError.message)

    const lowerMessage = String(uploadError.message || '').toLowerCase()
    if (lowerMessage.includes('row-level security') || lowerMessage.includes('permission')) {
      throw createError({
        statusCode: 403,
        statusMessage: `Sem permissao para salvar a foto de ${type}. Verifique as politicas do Storage.`,
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Nao foi possivel salvar a foto de ${type}.`,
    })
  }

  const { data: publicUrlData } = (client as any).storage
    .from(storageBucket)
    .getPublicUrl(path)

  return publicUrlData?.publicUrl || path
}

const createContatoId = () => `crm-${Date.now()}-${randomUUID().slice(0, 8)}`

const getTelefoneFromContatoId = (contatoId: string) => {
  const raw = String(contatoId || '').trim()
  if (!raw || raw.includes('@')) return null

  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 13) return null

  return raw
}

const ensureCrmContato = async (
  client: any,
  input: {
    contatoId?: string
    nomeCliente: string
  },
) => {
  const nomeCliente = input.nomeCliente.trim()
  const contatoId = String(input.contatoId || '').trim()

  if (!nomeCliente) throw badRequest('Nome do cliente e obrigatorio para vincular no CRM.')

  if (contatoId) {
    const { data: existingById, error: existingByIdError } = await (client as any)
      .from('crm_zincao')
      .select('contato_id, nome')
      .eq('contato_id', contatoId)
      .maybeSingle()

    if (existingByIdError) throw mapSupabaseCreateError(existingByIdError)

    if (existingById) {
      if (!existingById.nome || String(existingById.nome).trim() !== nomeCliente) {
        const { error: updateError } = await (client as any)
          .from('crm_zincao')
          .update({ nome: nomeCliente })
          .eq('contato_id', contatoId)

        if (updateError) throw mapSupabaseCreateError(updateError)
      }

      return {
        contato_id: contatoId,
        nome: nomeCliente,
        telefone_cliente: getTelefoneFromContatoId(contatoId),
      }
    }

    const { error: insertByIdError } = await (client as any)
      .from('crm_zincao')
      .insert({
        contato_id: contatoId,
        nome: nomeCliente,
      })

    if (insertByIdError) throw mapSupabaseCreateError(insertByIdError)

    return {
      contato_id: contatoId,
      nome: nomeCliente,
      telefone_cliente: getTelefoneFromContatoId(contatoId),
    }
  }

  const { data: existingByNome, error: existingByNomeError } = await (client as any)
    .from('crm_zincao')
    .select('contato_id, nome')
    .ilike('nome', nomeCliente)
    .limit(1)

  if (existingByNomeError) throw mapSupabaseCreateError(existingByNomeError)

  const contatoNome = Array.isArray(existingByNome) ? existingByNome[0] : null
  if (contatoNome?.contato_id) {
    return {
      contato_id: String(contatoNome.contato_id),
      nome: nomeCliente,
      telefone_cliente: getTelefoneFromContatoId(String(contatoNome.contato_id)),
    }
  }

  const generatedContatoId = createContatoId()
  const { error: insertError } = await (client as any)
    .from('crm_zincao')
    .insert({
      contato_id: generatedContatoId,
      nome: nomeCliente,
    })

  if (insertError) throw mapSupabaseCreateError(insertError)

  return {
    contato_id: generatedContatoId,
    nome: nomeCliente,
    telefone_cliente: null,
  }
}

export const notasCreatePostHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sessao expirada. Faca login novamente.',
    })
  }

  let body: NotaRetiradaDraft
  try {
    body = await readBody<NotaRetiradaDraft>(event)
  }
  catch {
    throw badRequest('Corpo da requisicao invalido.')
  }

  if (!body || typeof body !== 'object') throw badRequest('Corpo da requisicao invalido.')

  const authUid = getAuthUidOrThrow(user)
  const client = await serverSupabaseClient(event)
  await assertCanCreateNota(client as any, authUid)

  const numeroNota = String(body.numero_nota || '').trim()
  const serieNota = String(body.serie_nota || '').trim() || '1'
  const chaveNfe = normalizeDigits(body.chave_nfe)
  const produtosBase = normalizeProdutos(body.produtos)
  const dataCompra = normalizeDate(body.data_compra)
  const dataPrevistaRetirada = normalizeDate(body.data_prevista_retirada)
  const valorTotal = toNumber(body.valor_total)
  const descontoTotal = toNumber(body.desconto_total) ?? 0
  const fotoCupomDataUrl = String(body.foto_cupom_data_url || '').trim()
  const fotoClienteDataUrl = String(body.foto_cliente_data_url || '').trim()
  const statusInicial = allowedStatus.includes(body.status_retirada as any)
    ? body.status_retirada
    : 'pendente'

  const missing = requiredFields.filter((field) => {
    if (field === 'produtos') return produtosBase.length === 0
    if (field === 'data_compra') return !dataCompra
    return !String(body[field] || '').trim()
  })

  if (missing.length > 0) throw badRequest(`Campos obrigatorios faltando: ${missing.join(', ')}`)
  if (!isValidISODate(dataCompra)) throw badRequest('Data da compra invalida. Use o formato AAAA-MM-DD.')
  if (dataPrevistaRetirada && !isValidISODate(dataPrevistaRetirada)) {
    throw badRequest('Data prevista de retirada invalida. Use o formato AAAA-MM-DD.')
  }
  if (descontoTotal < 0) throw badRequest('desconto_total nao pode ser negativo.')
  if (valorTotal !== undefined && descontoTotal > valorTotal) {
    throw badRequest('desconto_total nao pode ser maior que valor_total.')
  }
  if (!fotoCupomDataUrl) throw badRequest('Foto do cupom e obrigatoria.')

  const { data: existingNumeroNotas, error: existingNumeroError } = await (client as any)
    .from('notas_retirada')
    .select('id, nome_cliente, numero_nota, serie_nota, deleted_at')
    .eq('owner_user_id', authUid)
    .eq('numero_nota', numeroNota)
    .limit(5)

  if (existingNumeroError) {
    console.error('[api/notas/create] existing numero check error:', existingNumeroError.message)
    throw mapSupabaseCreateError(existingNumeroError)
  }

  const existingNumeroNota = Array.isArray(existingNumeroNotas)
    ? existingNumeroNotas.find((nota: any) => !nota.deleted_at) || existingNumeroNotas[0]
    : null
  if (existingNumeroNota) {
    const location = existingNumeroNota.deleted_at ? 'na lixeira' : 'ativa'
    throw createError({
      statusCode: 409,
      statusMessage: `Ja existe uma nota ${location} com o numero ${numeroNota}: serie ${existingNumeroNota.serie_nota}.`,
    })
  }

  if (chaveNfe) {
    const { data: existingChaveNotas, error: existingChaveError } = await (client as any)
      .from('notas_retirada')
      .select('id, nome_cliente, numero_nota, serie_nota, deleted_at')
      .eq('owner_user_id', authUid)
      .eq('chave_nfe', chaveNfe)
      .limit(5)

    if (existingChaveError) {
      console.error('[api/notas/create] existing chave check error:', existingChaveError.message)
      throw mapSupabaseCreateError(existingChaveError)
    }

    const existingChaveNota = Array.isArray(existingChaveNotas)
      ? existingChaveNotas.find((nota: any) => !nota.deleted_at) || existingChaveNotas[0]
      : null
    if (existingChaveNota) {
      const location = existingChaveNota.deleted_at ? 'na lixeira' : 'ativa'
      throw createError({
        statusCode: 409,
        statusMessage: `Ja existe uma nota ${location} com essa chave: ${existingChaveNota.serie_nota}-${existingChaveNota.numero_nota}.`,
      })
    }
  }

  let produtos
  try {
    produtos = await vincularProdutosAoEstoque(client as any, produtosBase)
  }
  catch (error) {
    console.error('[api/notas/create] estoque match error:', error)
    if (isHttpError(error)) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel vincular os produtos ao estoque.',
    })
  }

  let crmContato
  try {
    crmContato = await ensureCrmContato(client, {
      contatoId: body.contato_id,
      nomeCliente: body.nome_cliente,
    })
  }
  catch (error) {
    console.error('[api/notas/create] crm error:', error)
    if (isHttpError(error)) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel validar ou criar o cliente no CRM.',
    })
  }

  let fotoCupomUrl: string
  let fotoClienteUrl: string | null = null
  try {
    fotoCupomUrl = await uploadImageDataUrl(client, authUid, 'cupom', fotoCupomDataUrl)
    fotoClienteUrl = fotoClienteDataUrl
      ? await uploadImageDataUrl(client, authUid, 'cliente', fotoClienteDataUrl)
      : null
  }
  catch (error) {
    console.error('[api/notas/create] storage error:', error)
    if (isHttpError(error)) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel salvar as imagens da nota.',
    })
  }

  const payload = {
    owner_user_id: authUid,
    contato_id: crmContato.contato_id,
    foto_url: fotoCupomUrl,
    ...(fotoClienteUrl ? { foto_cliente_url: fotoClienteUrl } : {}),
    nome_cliente: crmContato.nome,
    documento_cliente: normalizeDigits(body.documento_cliente),
    telefone_cliente: crmContato.telefone_cliente || normalizeDigits(body.telefone_cliente),
    numero_nota: numeroNota,
    serie_nota: serieNota,
    chave_nfe: chaveNfe || null,
    data_compra: dataCompra,
    data_prevista_retirada: dataPrevistaRetirada || null,
    produtos,
    valor_total: valorTotal ?? null,
    desconto_total: descontoTotal,
    observacoes: String(body.observacoes || '').trim() || null,
    status_retirada: statusInicial,
  }

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .insert(payload)
    .select(notaReturnSelect)
    .single()

  if (error) {
    console.error('[api/notas/create] insert error:', error.message)
    throw mapSupabaseCreateError(error)
  }

  return {
    success: true,
    nota: await signNotaStorageUrls(client as any, {
      ...data,
      cadastrado_por_nome: String(user.user_metadata?.nome || user.email || '').trim() || null,
    }),
  }
})

export default notasCreatePostHandler
