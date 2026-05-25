import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import { carregarRetiradasHistorico } from '../../services/retiradas-historico'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)

  try {
    const result = await carregarRetiradasHistorico(client as any, {
      page: Number(String(query.page || '1').trim()),
      pageSize: Number(String(query.page_size || '12').trim()),
      sortKey: String(query.sort_key || 'data').trim(),
      sortOrder: String(query.sort_order || 'desc').trim(),
      search: String(query.search || '').trim(),
      dataInicio: String(query.data_inicio || '').trim(),
      dataFim: String(query.data_fim || '').trim(),
      horaInicio: String(query.hora_inicio || '').trim(),
      horaFim: String(query.hora_fim || '').trim(),
    })

    return {
      success: true,
      historico: result.historico,
      resumo: result.resumo,
      pagination: result.pagination,
    }
  }
  catch (error: any) {
    console.error('[api/dashboard/retiradas-historico] error:', error?.message || error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel carregar o historico de retiradas.',
    })
  }
})
