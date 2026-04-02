import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database, EstoqueProdutoRow } from '../../../app/types/database.types'
import type { EstoqueProdutoDraft } from '../../../shared/types/Estoque'
import {
  assertAdminAccess,
  assertProdutoPaiExists,
  estoqueSelectFields,
  fetchProdutosPaiMap,
  mapEstoqueRow,
  normalizeEstoquePayload,
} from './_helpers'

export default defineEventHandler(async (event) => {
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

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID do produto inválido.',
    })
  }

  const client = await serverSupabaseClient<Database>(event)
  await assertAdminAccess(client, authUid)

  const body = await readBody<Partial<EstoqueProdutoDraft>>(event)
  const payload = normalizeEstoquePayload(body, { partial: true })

  if (Object.keys(payload).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nenhum campo foi enviado para atualização.',
    })
  }

  if (typeof payload.IDPRODUTOPAI === 'number') {
    await assertProdutoPaiExists(client, payload.IDPRODUTOPAI, id)
  }

  const { data, error } = await (client as any)
    .from('bd_estoque_geral')
    .update(payload)
    .eq('IDPRODUTO', id)
    .select(estoqueSelectFields)
    .maybeSingle()

  if (error) {
    console.error('[api/estoque/:id/patch] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível atualizar o produto do estoque.',
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