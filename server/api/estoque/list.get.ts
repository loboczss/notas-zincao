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
  const search = String(query.search || '').trim()
  const tipoProduto = String(query.tipo_produto || '').trim()
  const page = Math.max(1, Number(query.page || 1) || 1)
  const pageSize = Math.min(Math.max(Number(query.page_size || query.limit || 30), 1), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

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
    console.error('[api/estoque/list] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível listar os produtos do estoque.',
    })
  }

  const rows = (data || []) as EstoqueProdutoRow[]
  const parentMap = await fetchProdutosPaiMap(
    client,
    rows
      .map(item => item.IDPRODUTOPAI)
      .filter((item): item is number => typeof item === 'number'),
  )

  const totalItens = Number(count || 0)

  const chunkSize = 1000
  let cursor = 0
  let quantidadeTotalEstoque = 0

  while (true) {
    let chunkRequest = (client as any)
      .from('bd_estoque_geral')
      .select('QUANTIDADEESTOQUE')
      .range(cursor, cursor + chunkSize - 1)

    chunkRequest = applyEstoqueSearchFilters(chunkRequest, {
      search,
      tipo_produto: tipoProduto,
    })

    const { data: chunkRows, error: chunkError } = await chunkRequest

    if (chunkError) {
      console.error('[api/estoque/list] stats error:', chunkError.message)
      throw createError({
        statusCode: 500,
        statusMessage: 'Não foi possível calcular os totais do estoque.',
      })
    }

    const rowsChunk = (chunkRows || []) as Array<{ QUANTIDADEESTOQUE?: number }>
    quantidadeTotalEstoque += rowsChunk.reduce((acc, item) => acc + Number(item?.QUANTIDADEESTOQUE || 0), 0)

    if (rowsChunk.length < chunkSize) {
      break
    }

    cursor += chunkSize
  }

  return {
    success: true,
    produtos: rows.map(item => mapEstoqueRow(item, parentMap.get(item.IDPRODUTOPAI || 0) || null)),
    meta: {
      page,
      page_size: pageSize,
      total_itens: totalItens,
      total_paginas: Math.max(1, Math.ceil(totalItens / pageSize)),
    },
    stats: {
      quantidade_total_estoque: Number(quantidadeTotalEstoque.toFixed(3)),
    },
  }
})