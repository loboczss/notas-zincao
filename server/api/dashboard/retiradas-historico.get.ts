import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)

  const pageRaw = Number(String(query.page || '1').trim())
  const pageSizeRaw = Number(String(query.page_size || '5').trim())
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
    ? Math.min(100, Math.trunc(pageSizeRaw))
    : 5
  const sortKey = String(query.sort_key || 'data').trim()
  const sortOrder = String(query.sort_order || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc'

  // 1. Carregar Zinco (ID 10) e seus filhos para obter fator de conversão
  const { data: produtoBase } = await (client as any)
    .from('bd_estoque_geral')
    .select('IDPRODUTO, DESCRICAO, QUANTIDADEESTOQUE, IDPRODUTOPAI, FATORCONVERSAO')
    .eq('IDPRODUTO', 10)
    .maybeSingle()

  const { data: produtosFilhos } = await (client as any)
    .from('bd_estoque_geral')
    .select('IDPRODUTO, DESCRICAO, QUANTIDADEESTOQUE, IDPRODUTOPAI, FATORCONVERSAO')
    .eq('IDPRODUTOPAI', 10)

  const produtosRelacionados = [produtoBase, ...((produtosFilhos || []) as any[])].filter(Boolean)
  const conversaoPorId = new Map<number, number>()

  for (const produto of produtosRelacionados) {
    const id = Number(produto.IDPRODUTO || 0)
    if (!id) continue
    if (id === 10) {
      conversaoPorId.set(id, 1)
      continue
    }
    const fator = Number(produto.FATORCONVERSAO || 0)
    conversaoPorId.set(id, fator > 0 ? fator : 1)
  }

  const idsRelacionados = [...conversaoPorId.keys()]

  // 2. Carregar todas as notas que possuem histórico de retiradas.
  // Usa paginação interna para não depender do limite global de linhas da Data API.
  const notas: any[] = []
  const chunkSize = 500
  let from = 0

  while (true) {
    const { data: notasChunk, error: notasError } = await (client as any)
      .from('notas_retirada')
      .select('id, numero_nota, serie_nota, nome_cliente, produtos, historico_retiradas')
      .not('historico_retiradas', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + chunkSize - 1)

    if (notasError) {
      console.error('[api/dashboard/retiradas-historico] error:', notasError.message)
      throw createError({
        statusCode: 500,
        statusMessage: 'Não foi possível carregar o histórico de retiradas.',
      })
    }

    const chunk = Array.isArray(notasChunk) ? notasChunk : []
    if (!chunk.length) break

    notas.push(...chunk)
    if (chunk.length < chunkSize) break

    from += chunkSize
  }

  const historicoGlobal: any[] = []

  for (const nota of notas) {
    const historico = Array.isArray(nota.historico_retiradas) ? nota.historico_retiradas : []
    const produtos = Array.isArray(nota.produtos) ? nota.produtos : []

    for (const evento of historico) {
      const itensRetiradosRaw = Array.isArray(evento.itens_retirados) ? evento.itens_retirados : []
      let reducaoZinco10 = 0
      const itens: any[] = []

      for (const it of itensRetiradosRaw) {
        const produtoObj = produtos[it.index]
        if (!produtoObj) continue

        const nome = String(produtoObj.nome || '').trim()
        const quantidade = Number(it.quantidade || 0)
        const idProduto = Number(produtoObj.id_produto_estoque || 0)

        itens.push({
          nome,
          quantidade,
        })

        if (idsRelacionados.includes(idProduto)) {
          const fator = conversaoPorId.get(idProduto) || 1
          reducaoZinco10 += (quantidade * fator)
        }
      }

      // Apenas insere se houver itens retirados efetivos no evento
      if (itens.length > 0) {
        historicoGlobal.push({
          id_nota: nota.id,
          numero_nota: nota.numero_nota,
          serie_nota: nota.serie_nota,
          nome_cliente: nota.nome_cliente,
          data: evento.data || new Date().toISOString(),
          responsavel_nome: evento.responsavel_nome || 'Sistema',
          itens,
          reducao_zinco_10: Number(reducaoZinco10.toFixed(2)),
        })
      }
    }
  }

  const normalizedSortKey = ['data', 'nome_cliente', 'itens', 'reducao_zinco_10'].includes(sortKey)
    ? sortKey
    : 'data'

  historicoGlobal.sort((a, b) => {
    let valA: any = a[normalizedSortKey]
    let valB: any = b[normalizedSortKey]

    if (normalizedSortKey === 'itens') {
      valA = Array.isArray(a.itens) ? a.itens.length : 0
      valB = Array.isArray(b.itens) ? b.itens.length : 0
    }
    else if (normalizedSortKey === 'data') {
      valA = new Date(a.data || '').getTime()
      valB = new Date(b.data || '').getTime()
    }

    if (typeof valA === 'string') {
      valA = valA.toLowerCase()
      valB = String(valB || '').toLowerCase()
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const total = historicoGlobal.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const fromIndex = (safePage - 1) * pageSize
  const toIndex = fromIndex + pageSize
  const historicoPaginado = historicoGlobal.slice(fromIndex, toIndex)

  return {
    success: true,
    historico: historicoPaginado,
    pagination: {
      page: safePage,
      page_size: pageSize,
      total,
      total_pages: totalPages,
    },
  }

})
