import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  EstoqueProdutoInsert,
  EstoqueProdutoRow,
  EstoqueProdutoUpdate,
  Database,
} from '../../../app/types/database.types'
import type { EstoqueProduto, EstoqueProdutoDraft } from '../../../shared/types/Estoque'

export const estoqueSelectFields = [
  'IDPRODUTO',
  'DESCRICAO',
  'EMBALAGEMSAIDA',
  'VALPRECOVAREJO',
  'TIPOPRODUTO',
  'QUANTIDADEESTOQUE',
  'CRIADOEM',
  'ATUALIZADOEM',
  'IDPRODUTOPAI',
  'FATORCONVERSAO',
].join(', ')

type EstoqueClient = SupabaseClient<Database>

export const applyEstoqueSearchFilters = (
  request: any,
  options: {
    search?: string
    tipo_produto?: string
  },
) => {
  const search = String(options.search || '').trim()
  const tipoProduto = String(options.tipo_produto || '').trim()

  let filtered = request

  if (tipoProduto) {
    filtered = filtered.eq('TIPOPRODUTO', tipoProduto)
  }

  if (search) {
    const numericSearch = Number(search)
    if (Number.isFinite(numericSearch) && String(Math.trunc(numericSearch)) === search) {
      filtered = filtered.eq('IDPRODUTO', Math.trunc(numericSearch))
    }
    else {
      filtered = filtered.ilike('DESCRICAO', `%${search}%`)
    }
  }

  return filtered
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

const toInteger = (value: unknown) => {
  const parsed = toNumber(value)
  if (parsed === undefined) {
    return undefined
  }

  return Math.trunc(parsed)
}

const normalizeText = (value: unknown, maxLength = 255) => {
  return String(value || '').trim().slice(0, maxLength)
}

const normalizeNullableText = (value: unknown, maxLength = 255) => {
  const normalized = normalizeText(value, maxLength)
  return normalized || null
}

export const mapEstoqueRow = (
  row: EstoqueProdutoRow,
  produtoPai?: { id_produto: number; descricao: string } | null,
): EstoqueProduto => {
  return {
    id_produto: row.IDPRODUTO,
    descricao: row.DESCRICAO,
    embalagem_saida: row.EMBALAGEMSAIDA,
    valor_preco_varejo: row.VALPRECOVAREJO,
    tipo_produto: row.TIPOPRODUTO,
    quantidade_estoque: Number(row.QUANTIDADEESTOQUE || 0),
    criado_em: row.CRIADOEM,
    atualizado_em: row.ATUALIZADOEM,
    id_produto_pai: row.IDPRODUTOPAI,
    fator_conversao: row.FATORCONVERSAO === null ? null : Number(row.FATORCONVERSAO),
    produto_pai: produtoPai ?? null,
  }
}

export const fetchProdutosPaiMap = async (client: EstoqueClient, parentIds: number[]) => {
  if (!parentIds.length) {
    return new Map<number, { id_produto: number; descricao: string }>()
  }

  const uniqueIds = [...new Set(parentIds.filter(id => Number.isFinite(id) && id > 0))]
  if (!uniqueIds.length) {
    return new Map<number, { id_produto: number; descricao: string }>()
  }

  const { data, error } = await (client as any)
    .from('bd_estoque_geral')
    .select('IDPRODUTO, DESCRICAO')
    .in('IDPRODUTO', uniqueIds)

  if (error) {
    console.error('[api/estoque] parent fetch error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível carregar produtos pai do estoque.',
    })
  }

  return new Map(
    ((data || []) as Array<{ IDPRODUTO: number; DESCRICAO: string }>).map(item => [
      item.IDPRODUTO,
      {
        id_produto: item.IDPRODUTO,
        descricao: item.DESCRICAO,
      },
    ]),
  )
}

export const assertAdminAccess = async (client: EstoqueClient, authUid: string) => {
  const { data: profile, error } = await (client as any)
    .from('profiles')
    .select('role, deleted_at')
    .eq('auth_uid', authUid)
    .maybeSingle()

  if (error) {
    console.error('[api/estoque] profile error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível validar permissões do usuário.',
    })
  }

  const role = String((profile as { role?: string | null } | null)?.role || '').trim().toLowerCase()
  if ((profile as { deleted_at?: string | null } | null)?.deleted_at || role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Somente administradores podem editar o estoque.',
    })
  }
}

export const assertProdutoPaiExists = async (client: EstoqueClient, idProdutoPai: number, currentId?: number) => {
  if (currentId && idProdutoPai === currentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Um produto não pode ser pai de si mesmo.',
    })
  }

  const { data, error } = await (client as any)
    .from('bd_estoque_geral')
    .select('IDPRODUTO')
    .eq('IDPRODUTO', idProdutoPai)
    .maybeSingle()

  if (error) {
    console.error('[api/estoque] parent validate error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível validar o produto pai informado.',
    })
  }

  if (!data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Produto pai não encontrado no estoque.',
    })
  }
}

export const normalizeEstoquePayload = (
  body: Partial<EstoqueProdutoDraft> | null | undefined,
  options: { partial?: boolean } = {},
): EstoqueProdutoInsert | EstoqueProdutoUpdate => {
  const partial = options.partial === true
  const payload: EstoqueProdutoInsert | EstoqueProdutoUpdate = {}

  if (!partial || body?.descricao !== undefined) {
    const descricao = normalizeText(body?.descricao)
    if (!descricao) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Descrição é obrigatória.',
      })
    }
    payload.DESCRICAO = descricao
  }

  if (!partial || body?.embalagem_saida !== undefined) {
    const embalagemSaida = normalizeText(body?.embalagem_saida)
    if (!embalagemSaida) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Embalagem de saída é obrigatória.',
      })
    }
    payload.EMBALAGEMSAIDA = embalagemSaida
  }

  if (!partial || body?.quantidade_estoque !== undefined) {
    const quantidade = toNumber(body?.quantidade_estoque)
    if (quantidade === undefined || quantidade < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Quantidade em estoque deve ser um número maior ou igual a zero.',
      })
    }
    payload.QUANTIDADEESTOQUE = Number(quantidade.toFixed(3))
  }

  if (!partial || body?.fator_conversao !== undefined) {
    const fator = body?.fator_conversao === null || body?.fator_conversao === ''
      ? null
      : toNumber(body?.fator_conversao)

    if (fator !== null && fator !== undefined && fator <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Fator de conversão deve ser maior que zero.',
      })
    }

    if (fator !== undefined) {
      payload.FATORCONVERSAO = fator === null ? null : Number(fator.toFixed(3))
    }
  }

  if (!partial || body?.tipo_produto !== undefined) {
    payload.TIPOPRODUTO = normalizeNullableText(body?.tipo_produto)
  }

  if (!partial || body?.valor_preco_varejo !== undefined) {
    payload.VALPRECOVAREJO = normalizeNullableText(body?.valor_preco_varejo)
  }

  if (!partial || body?.id_produto_pai !== undefined) {
    const idProdutoPai = body?.id_produto_pai === null || body?.id_produto_pai === ''
      ? null
      : toInteger(body?.id_produto_pai)

    if (idProdutoPai !== null && idProdutoPai !== undefined && idProdutoPai <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'id_produto_pai deve ser um inteiro positivo.',
      })
    }

    if (idProdutoPai !== undefined) {
      payload.IDPRODUTOPAI = idProdutoPai
    }
  }

  return payload
}