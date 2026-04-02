import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import { canonicalizarProdutosPorIdEstoque } from '../../../services/estoque/match-produtos'

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
      statusMessage: 'Nota id is required.',
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .select('id, contato_id, owner_user_id, nome_cliente, documento_cliente, telefone_cliente, numero_nota, serie_nota, chave_nfe, data_compra, data_prevista_retirada, data_retirada, valor_total, desconto_total, observacoes, status_retirada, criado_em, atualizado_em, retirada_confirmada_por, produtos, foto_url, foto_cliente_url, comprovante_retirada_url, historico_retiradas')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Nota não encontrada.',
    })
  }

  let cadastradoPorNome: string | null = null

  if (data.owner_user_id) {
    const { data: profile } = await (client as any)
      .from('profiles')
      .select('nome, email')
      .eq('auth_uid', data.owner_user_id)
      .maybeSingle()

    cadastradoPorNome = String(profile?.nome || profile?.email || '').trim() || null
  }

  const produtosNormalizados = await canonicalizarProdutosPorIdEstoque(
    client as any,
    Array.isArray(data.produtos) ? data.produtos : [],
  )

  const historicoRaw = Array.isArray(data.historico_retiradas) ? data.historico_retiradas : []
  const responsaveisIds = [...new Set(
    historicoRaw
      .map((item: any) => String(item?.responsavel_id || item?.usuario_id || '').trim())
      .filter(Boolean),
  )]

  const responsaveisMap = new Map<string, string>()
  if (responsaveisIds.length) {
    const { data: profilesData } = await (client as any)
      .from('profiles')
      .select('auth_uid, nome, email')
      .in('auth_uid', responsaveisIds)

    for (const profile of (profilesData || []) as Array<{ auth_uid: string; nome?: string | null; email?: string | null }>) {
      responsaveisMap.set(
        String(profile.auth_uid || ''),
        String(profile.nome || profile.email || '').trim() || String(profile.auth_uid || ''),
      )
    }
  }

  const historicoNormalizado = historicoRaw.map((item: any) => {
    const responsavelId = String(item?.responsavel_id || item?.usuario_id || '').trim()
    const responsavelNome = String(item?.responsavel_nome || '').trim()

    return {
      ...item,
      responsavel_id: responsavelId || null,
      responsavel_nome: responsavelNome || responsaveisMap.get(responsavelId) || responsavelId || null,
      fotos: Array.isArray(item?.fotos) ? item.fotos : [],
      itens_retirados: Array.isArray(item?.itens_retirados) ? item.itens_retirados : [],
    }
  })

  return {
    success: true,
    nota: {
      ...data,
      produtos: produtosNormalizados,
      historico_retiradas: historicoNormalizado,
      cadastrado_por_nome: cadastradoPorNome,
    },
  }
})
