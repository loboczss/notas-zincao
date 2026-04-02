import type { NotaProduto } from '../../../shared/types/NotasRetirada'

type EstoqueCandidate = {
  IDPRODUTO: number
  DESCRICAO: string
  EMBALAGEMSAIDA: string
  TIPOPRODUTO: string | null
}

const mapEstoqueToNotaProduto = (candidate: EstoqueCandidate, confidence = 1) => ({
  id_produto_estoque: candidate.IDPRODUTO,
  nome: candidate.DESCRICAO,
  embalagem: candidate.EMBALAGEMSAIDA,
  tipo_produto: candidate.TIPOPRODUTO,
  confidence: Number(confidence.toFixed(3)),
})

const normalizeText = (value: unknown) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const tokenize = (value: string) => {
  return normalizeText(value)
    .split(' ')
    .filter(token => token.length >= 2)
}

const getScore = (query: string, candidate: string) => {
  const normalizedQuery = normalizeText(query)
  const normalizedCandidate = normalizeText(candidate)

  if (!normalizedQuery || !normalizedCandidate) {
    return 0
  }

  if (normalizedQuery === normalizedCandidate) {
    return 1
  }

  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return 0.95
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0.88
  }

  const queryTokens = tokenize(normalizedQuery)
  const candidateTokens = tokenize(normalizedCandidate)
  if (!queryTokens.length || !candidateTokens.length) {
    return 0
  }

  let score = 0
  let matchedTokens = 0

  for (const token of queryTokens) {
    const exact = candidateTokens.includes(token)
    const partial = candidateTokens.some(candidateToken => candidateToken.startsWith(token) || token.startsWith(candidateToken))

    if (exact) {
      matchedTokens += 1
      score += 1
      continue
    }

    if (partial) {
      matchedTokens += 1
      score += 0.7
    }
  }

  if (!matchedTokens) {
    return 0
  }

  return Math.min(0.85, score / queryTokens.length)
}

const buildSearchTerms = (nome: string) => {
  const normalized = normalizeText(nome)
  const tokens = tokenize(normalized)
  const uniqueTokens = [...new Set(tokens)]
  const terms = [normalized, ...uniqueTokens.slice(0, 4)]
    .map(term => term.trim())
    .filter(Boolean)

  return [...new Set(terms)]
}

export const buscarSugestoesProdutoEstoque = async (client: any, nome: string, limit = 12) => {
  const searchTerms = buildSearchTerms(nome)
  if (!searchTerms.length) {
    return [] as EstoqueCandidate[]
  }

  let request = (client as any)
    .from('bd_estoque_geral')
    .select('IDPRODUTO, DESCRICAO, EMBALAGEMSAIDA, TIPOPRODUTO')
    .order('DESCRICAO', { ascending: true })
    .limit(limit)

  const ilikeClauses = searchTerms.map(term => `DESCRICAO.ilike.%${term}%`)
  if (ilikeClauses.length) {
    request = request.or(ilikeClauses.join(','))
  }

  const { data, error } = await request

  if (error) {
    console.error('[estoque/match] search error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível buscar produtos no estoque.',
    })
  }

  return (data || []) as EstoqueCandidate[]
}

export const buscarProdutosEstoquePorIds = async (client: any, ids: number[]) => {
  const uniqueIds = [...new Set(ids.filter(id => Number.isFinite(id) && id > 0))]
  if (!uniqueIds.length) {
    return new Map<number, EstoqueCandidate>()
  }

  const { data, error } = await (client as any)
    .from('bd_estoque_geral')
    .select('IDPRODUTO, DESCRICAO, EMBALAGEMSAIDA, TIPOPRODUTO')
    .in('IDPRODUTO', uniqueIds)

  if (error) {
    console.error('[estoque/match] fetch by ids error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível validar os produtos no estoque.',
    })
  }

  return new Map(
    ((data || []) as EstoqueCandidate[]).map(item => [item.IDPRODUTO, item]),
  )
}

export const encontrarProdutoEstoque = async (client: any, nome: string) => {
  const candidates = await buscarSugestoesProdutoEstoque(client, nome, 20)
  if (!candidates.length) {
    return null
  }

  const bestMatch = candidates
    .map((candidate) => ({
      candidate,
      score: getScore(nome, candidate.DESCRICAO),
    }))
    .sort((a, b) => b.score - a.score)[0]

  if (!bestMatch || bestMatch.score < 0.55) {
    return null
  }

  return mapEstoqueToNotaProduto(bestMatch.candidate, bestMatch.score)
}

export const vincularProdutosAoEstoque = async (client: any, produtos: NotaProduto[]) => {
  const resolvedProducts: NotaProduto[] = []
  const estoquePorId = await buscarProdutosEstoquePorIds(
    client,
    produtos.map(produto => Number(produto.id_produto_estoque || 0)),
  )

  for (const produto of produtos) {
    const nome = String(produto.nome || '').trim()
    if (!nome) {
      continue
    }

    let match = null
    const produtoPorId = Number(produto.id_produto_estoque || 0)
      ? estoquePorId.get(Number(produto.id_produto_estoque || 0))
      : null

    if (produtoPorId) {
      match = mapEstoqueToNotaProduto(produtoPorId, 1)
    }
    else {
      match = await encontrarProdutoEstoque(client, nome)
    }

    resolvedProducts.push({
      ...produto,
      nome: match?.nome || nome,
      ...(match?.id_produto_estoque ? { id_produto_estoque: match.id_produto_estoque } : {}),
      ...(match?.embalagem ? { embalagem: match.embalagem } : {}),
      ...(match?.tipo_produto !== undefined ? { tipo_produto: match.tipo_produto } : {}),
      ...(match?.confidence !== undefined ? { confidence: match.confidence } : {}),
    })
  }

  return resolvedProducts
}

export const canonicalizarProdutosPorIdEstoque = async (client: any, produtos: NotaProduto[]) => {
  if (!Array.isArray(produtos) || !produtos.length) {
    return [] as NotaProduto[]
  }

  const estoquePorId = await buscarProdutosEstoquePorIds(
    client,
    produtos.map(produto => Number(produto.id_produto_estoque || 0)),
  )

  return produtos.map((produto) => {
    const estoqueId = Number(produto.id_produto_estoque || 0)
    const canonical = estoqueId ? estoquePorId.get(estoqueId) : null

    if (!canonical) {
      return produto
    }

    return {
      ...produto,
      ...mapEstoqueToNotaProduto(canonical, Number(produto.confidence || 1) || 1),
    }
  })
}