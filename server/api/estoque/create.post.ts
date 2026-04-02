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

  const client = await serverSupabaseClient<Database>(event)
  await assertAdminAccess(client, authUid)

  const body = await readBody<EstoqueProdutoDraft>(event)
  const payload = normalizeEstoquePayload(body)

  if (typeof payload.IDPRODUTOPAI === 'number') {
    await assertProdutoPaiExists(client, payload.IDPRODUTOPAI)
  }

  const { data, error } = await (client as any)
    .from('bd_estoque_geral')
    .insert(payload)
    .select(estoqueSelectFields)
    .single()

  if (error || !data) {
    console.error('[api/estoque/create] error:', error?.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível criar o produto do estoque.',
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