import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID da nota é obrigatório',
    })
  }

  const client = await serverSupabaseClient<Database>(event) as SupabaseClient<Database>

  // 1. Buscar dados atuais antes de excluir para o histórico
  const { data: notaAtual } = await client
    .from('notas_retirada')
    .select('*')
    .eq('id', id)
    .single()

  const updateData: Database['public']['Tables']['notas_retirada']['Update'] = {
    deleted_at: new Date().toISOString(),
    deleted_by: user.id,
  }

  // 2. Realizar o soft-delete
  const { error } = await client
    .from('notas_retirada')
    // @ts-ignore
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('[api/notas/delete] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível excluir a nota.',
    })
  }

  // 3. Registrar no histórico
  if (notaAtual) {
    await (client as any)
      .from('notas_historico_edicao')
      .insert({
        nota_id: id,
        user_id: user.id,
        dados_anteriores: notaAtual,
        dados_novos: updateData
      })
  }

  return { success: true }
})
