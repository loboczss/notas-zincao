import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { randomUUID } from 'node:crypto'
import type { NotaRetiradaDraft } from '../../../shared/types/NotasRetirada'

const requiredFields = ['nome_cliente', 'telefone_cliente', 'numero_nota', 'serie_nota', 'data_compra', 'produtos'] as const
const storageBucket = 'notas-retirada'
const allowedStatus = ['pendente', 'parcial', 'retirada', 'cancelada'] as const

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

const normalizeProdutos = (produtos: NotaRetiradaDraft['produtos']) => {
  if (!Array.isArray(produtos)) {
    return []
  }

  return produtos
    .map((item) => {
      const nome = String(item?.nome || '').trim()
      if (!nome) {
        return null
      }

      const quantidade = toNumber(item?.quantidade)
      const valorUnitario = toNumber(item?.valor_unitario)
      const unidade = String(item?.unidade || '').trim()

      return {
        nome,
        ...(quantidade !== undefined ? { quantidade } : {}),
        ...(valorUnitario !== undefined ? { valor_unitario: valorUnitario } : {}),
        ...(unidade ? { unidade } : {}),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

const normalizeDate = (value: unknown) => {
  const raw = String(value || '').trim()

  if (!raw) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch
    return `${yyyy}-${mm}-${dd}`
  }

  return raw
}

const isValidISODate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [yearRaw, monthRaw, dayRaw] = value.split('-').map(Number)
  const year = yearRaw ?? NaN
  const month = monthRaw ?? NaN
  const day = dayRaw ?? NaN

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return false
  }

  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day
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

const uploadImageDataUrl = async (
  client: any,
  ownerUserId: string,
  type: 'cupom' | 'cliente',
  dataUrl: string,
) => {
  const parsed = parseImageDataUrl(dataUrl)

  if (!parsed) {
    throw createError({
      statusCode: 400,
      statusMessage: `Imagem de ${type} inválida.`,
    })
  }

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
    throw createError({
      statusCode: 500,
      statusMessage: `Não foi possível salvar a foto de ${type}.`,
    })
  }

  const { data } = (client as any).storage.from(storageBucket).getPublicUrl(path)
  return data?.publicUrl || null
}

const createContatoId = () => {
  return `crm-${Date.now()}-${randomUUID().slice(0, 8)}`
}

const getTelefoneFromContatoId = (contatoId: string) => {
  const raw = String(contatoId || '').trim()

  if (!raw || raw.includes('@')) {
    return null
  }

  const digits = raw.replace(/\D/g, '')

  if (digits.length < 10 || digits.length > 13) {
    return null
  }

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

  if (!nomeCliente) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nome do cliente é obrigatório para vincular no CRM.',
    })
  }

  if (contatoId) {
    const { data: existingById, error: existingByIdError } = await (client as any)
      .from('crm_zincao')
      .select('contato_id, nome')
      .eq('contato_id', contatoId)
      .maybeSingle()

    if (existingByIdError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Não foi possível consultar o CRM por contato_id.',
      })
    }

    if (existingById) {
      if (!existingById.nome || String(existingById.nome).trim() !== nomeCliente) {
        await (client as any)
          .from('crm_zincao')
          .update({ nome: nomeCliente })
          .eq('contato_id', contatoId)
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

    if (insertByIdError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Não foi possível criar o cliente no CRM.',
      })
    }

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

  if (existingByNomeError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível consultar o CRM por nome.',
    })
  }

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

  if (insertError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível criar o cliente no CRM.',
    })
  }

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
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody<NotaRetiradaDraft>(event)
  const produtos = normalizeProdutos(body?.produtos)
  const dataCompra = normalizeDate(body?.data_compra)
  const dataPrevistaRetirada = normalizeDate(body?.data_prevista_retirada)
  const fotoCupomDataUrl = String(body?.foto_cupom_data_url || '').trim()
  const fotoClienteDataUrl = String(body?.foto_cliente_data_url || '').trim()
  const statusInicial = allowedStatus.includes(body?.status_retirada as any)
    ? body?.status_retirada
    : 'pendente'

  const missing = requiredFields.filter((field) => {
    if (field === 'produtos') {
      return produtos.length === 0
    }

    if (field === 'data_compra') {
      return !dataCompra
    }

    return !String(body?.[field] || '').trim()
  })

  if (missing.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Campos obrigatórios faltando: ${missing.join(', ')}`,
    })
  }

  if (!isValidISODate(dataCompra)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data da compra inválida. Use o formato correto de data.',
    })
  }

  if (dataPrevistaRetirada && !isValidISODate(dataPrevistaRetirada)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Data prevista de retirada inválida.',
    })
  }

  if (!fotoCupomDataUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Foto do cupom é obrigatória.',
    })
  }

  const authUid = user.id || user.sub

  if (!authUid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authenticated user id not found.',
    })
  }

  const client = await serverSupabaseClient(event)

  const { data: existingNota, error: existingNotaError } = await (client as any)
    .from('notas_retirada')
    .select('id')
    .eq('owner_user_id', authUid)
    .eq('numero_nota', body.numero_nota.trim())
    .eq('serie_nota', body.serie_nota.trim())
    .maybeSingle()

  if (existingNotaError) {
    console.error('[api/notas/create] existing note check error:', existingNotaError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível validar duplicidade da nota.',
    })
  }

  if (existingNota) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Essa nota (número/série) já foi cadastrada.',
    })
  }

  const crmContato = await ensureCrmContato(client, {
    contatoId: body.contato_id,
    nomeCliente: body.nome_cliente,
  })

  const fotoCupomUrl = await uploadImageDataUrl(client, authUid, 'cupom', fotoCupomDataUrl)
  const fotoClienteUrl = fotoClienteDataUrl
    ? await uploadImageDataUrl(client, authUid, 'cliente', fotoClienteDataUrl)
    : null

  const payload = {
    owner_user_id: authUid,
    contato_id: crmContato.contato_id,
    foto_url: fotoCupomUrl,
    ...(fotoClienteUrl ? { foto_cliente_url: fotoClienteUrl } : {}),
    nome_cliente: crmContato.nome,
    documento_cliente: String(body.documento_cliente || '').trim() || null,
    telefone_cliente: crmContato.telefone_cliente || String(body.telefone_cliente || '').trim() || null,
    numero_nota: body.numero_nota.trim(),
    serie_nota: body.serie_nota.trim(),
    chave_nfe: String(body.chave_nfe || '').trim() || null,
    data_compra: dataCompra,
    data_prevista_retirada: dataPrevistaRetirada || null,
    produtos,
    valor_total: toNumber(body.valor_total) ?? null,
    observacoes: String(body.observacoes || '').trim() || null,
    status_retirada: statusInicial,
  }

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .insert(payload)
    .select('id, nome_cliente, numero_nota, serie_nota, status_retirada')
    .single()

  if (error) {
    console.error('[api/notas/create] error:', error.message)

    if (error.code === '23505') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Essa nota (número/série) já foi cadastrada.',
      })
    }

    if (error.code === '42703' && String(error.message || '').includes('foto_cliente_url')) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Banco desatualizado: aplique a migration da coluna foto_cliente_url.',
      })
    }

    if (error.code === '42703' && String(error.message || '').includes('contato_id')) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Banco desatualizado: aplique a migration da coluna contato_id.',
      })
    }

    if (error.code === '22007') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Data da compra inválida.',
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível salvar a nota.',
    })
  }

  return {
    success: true,
    nota: data,
  }
})

export default notasCreatePostHandler
