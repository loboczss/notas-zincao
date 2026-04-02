import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient<Database>(event)

  const { data: produtoBase, error: produtoBaseError } = await (client as any)
    .from('bd_estoque_geral')
    .select('IDPRODUTO, DESCRICAO, QUANTIDADEESTOQUE, IDPRODUTOPAI, FATORCONVERSAO')
    .eq('IDPRODUTO', 10)
    .maybeSingle()

  if (produtoBaseError) {
    console.error('[api/dashboard/produto-10] produto base error:', produtoBaseError.message)
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível carregar o produto base do estoque.' })
  }

  if (!produtoBase) {
    throw createError({ statusCode: 404, statusMessage: 'Produto ID 10 não encontrado no estoque.' })
  }

  const { data: produtosFilhos, error: filhosError } = await (client as any)
    .from('bd_estoque_geral')
    .select('IDPRODUTO, DESCRICAO, QUANTIDADEESTOQUE, IDPRODUTOPAI, FATORCONVERSAO')
    .eq('IDPRODUTOPAI', 10)

  if (filhosError) {
    console.error('[api/dashboard/produto-10] filhos error:', filhosError.message)
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível carregar os produtos filhos do estoque.' })
  }

  const produtosRelacionados = [produtoBase, ...((produtosFilhos || []) as any[])]
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

  const { data: notasPendentes, error: notasError } = await (client as any)
    .from('notas_retirada')
    .select('id, produtos')
    .eq('status_retirada', 'pendente')

  if (notasError) {
    console.error('[api/dashboard/produto-10] notas error:', notasError.message)
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível carregar as notas pendentes.' })
  }

  let quantidadePendenteNotas = 0
  const notasComProduto = new Set<string>()

  for (const nota of (notasPendentes || []) as Array<{ id: string; produtos?: any[] }>) {
    const produtos = Array.isArray(nota.produtos) ? nota.produtos : []
    let notaTemProduto = false

    for (const item of produtos) {
      const idProduto = Number(item?.id_produto_estoque || 0)
      if (!idsRelacionados.includes(idProduto)) continue

      const quantidade = toNumber(item?.quantidade)
      const quantidadeRetirada = toNumber(item?.quantidade_retirada)
      const saldoPendente = Math.max(0, quantidade - quantidadeRetirada)
      const fator = conversaoPorId.get(idProduto) || 1

      quantidadePendenteNotas += saldoPendente * fator
      notaTemProduto = true
    }

    if (notaTemProduto && nota.id) {
      notasComProduto.add(String(nota.id))
    }
  }

  const saldoEstoque = Number(produtoBase.QUANTIDADEESTOQUE || 0)
  const quantidadePendenteConvertida = Number(quantidadePendenteNotas.toFixed(3))
  const percentualComprometido = saldoEstoque > 0
    ? Math.min(100, Math.round((quantidadePendenteConvertida / saldoEstoque) * 100))
    : 0

  return {
    success: true,
    produto: {
      id: Number(produtoBase.IDPRODUTO || 10),
      nome: String(produtoBase.DESCRICAO || 'Produto ID 10'),
      saldo_estoque: Number(saldoEstoque.toFixed(3)),
      notas_pendentes_com_produto: notasComProduto.size,
      quantidade_pendente_notas: quantidadePendenteConvertida,
      percentual_comprometido: percentualComprometido,
      quantidade_filhos: (produtosFilhos || []).length,
    },
  }
})
