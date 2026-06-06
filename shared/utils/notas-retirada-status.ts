import type { NotaProduto, NotaRetiradaStatus } from '../types/NotasRetirada'

const EPSILON = 0.000001

const toFiniteNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.').trim())
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}

export const getNotaRetiradaTotals = (produtos: NotaProduto[]) => {
  return produtos.reduce(
    (totals, produto) => {
      const quantidadeTotal = Math.max(0, toFiniteNumber(produto.quantidade, 1))
      const quantidadeRetirada = clamp(
        Math.max(0, toFiniteNumber(produto.quantidade_retirada, 0)),
        0,
        quantidadeTotal,
      )

      return {
        totalComprado: totals.totalComprado + quantidadeTotal,
        totalRetirado: totals.totalRetirado + quantidadeRetirada,
      }
    },
    { totalComprado: 0, totalRetirado: 0 },
  )
}

export const getNotaRetiradaStatusFromProdutos = (produtos: NotaProduto[]): NotaRetiradaStatus => {
  if (!produtos.length) return 'pendente'

  const { totalComprado, totalRetirado } = getNotaRetiradaTotals(produtos)

  if (totalComprado <= EPSILON || totalRetirado <= EPSILON) return 'pendente'
  if (totalRetirado + EPSILON >= totalComprado) return 'retirada'
  return 'parcial'
}

export const clampNotaProdutoQuantidadeRetirada = (produto: NotaProduto): NotaProduto => {
  const quantidadeTotal = Math.max(0, toFiniteNumber(produto.quantidade, 1))
  const quantidadeRetirada = clamp(
    Math.max(0, toFiniteNumber(produto.quantidade_retirada, 0)),
    0,
    quantidadeTotal,
  )

  return {
    ...produto,
    quantidade_retirada: quantidadeRetirada,
  }
}
