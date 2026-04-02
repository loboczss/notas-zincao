import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database, EstoqueProdutoRow } from '../../../app/types/database.types'
import {
  applyEstoqueSearchFilters,
  estoqueSelectFields,
  fetchProdutosPaiMap,
  mapEstoqueRow,
} from './_helpers'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const search = String(query.search || query.q || '').trim()
  const tipoProduto = String(query.tipo_produto || '').trim()
  const page = Math.max(1, Number(query.page || 1) || 1)
  const pageSize = Math.min(Math.max(Number(query.page_size || query.limit || 20), 1), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  if (!search) {
    return {
      success: true,
      produtos: [],
      meta: {
        page,
        page_size: pageSize,
        total_itens: 0,
        total_paginas: 1,
      },
    }
  }

  let request = (client as any)
    .from('bd_estoque_geral')
    .select(estoqueSelectFields, { count: 'exact' })
    .order('DESCRICAO', { ascending: true })
    .range(from, to)

  request = applyEstoqueSearchFilters(request, {
    search,
    tipo_produto: tipoProduto,
  })

  const { data, error, count } = await request

  if (error) {
    console.error('[api/estoque/search] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel pesquisar produtos no estoque.',
    })
  }

  const rows = (data || []) as EstoqueProdutoRow[]
  const parentMap = await fetchProdutosPaiMap(
    client,
    rows
      .map(item => item.IDPRODUTOPAI)
      .filter((item): item is number => typeof item === 'number'),
  )

  return {
    success: true,
    produtos: rows.map(item => mapEstoqueRow(item, parentMap.get(item.IDPRODUTOPAI || 0) || null)),
    meta: {
      page,
      page_size: pageSize,
      total_itens: Number(count || 0),
      total_paginas: Math.max(1, Math.ceil(Number(count || 0) / pageSize)),
    },
  }
})