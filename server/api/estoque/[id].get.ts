import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database, EstoqueProdutoRow } from '../../../app/types/database.types'
import {
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

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID do produto inválido.',
    })
  }

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await (client as any)
    .from('bd_estoque_geral')
    .select(estoqueSelectFields)
    .eq('IDPRODUTO', id)
    .maybeSingle()

  if (error) {
    console.error('[api/estoque/:id] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível carregar o produto do estoque.',
    })
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Produto do estoque não encontrado.',
    })
  }

  const row = data as EstoqueProdutoRow
  const parentMap = await fetchProdutosPaiMap(
    client,
    typeof row.IDPRODUTOPAI === 'number' ? [row.IDPRODUTOPAI] : [],
  )

  return {
    success: true,
    produto: mapEstoqueRow(row, parentMap.get(row.IDPRODUTOPAI || 0) || null),
  }
})