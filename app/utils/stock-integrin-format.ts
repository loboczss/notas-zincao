import type { StockIntegrinProduto } from '../../shared/types/StockIntegrin'

export const formatStockIntegrinNumber = (value: unknown, digits = 3) => {
  const number = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(number)
}

export const formatStockIntegrinCurrency = (value: unknown) => {
  const number = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(number)
}

export const formatStockIntegrinDate = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) return '-'

  const date = new Date(raw.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return raw

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export const stockIntegrinProductSubtitle = (produto: StockIntegrinProduto) => {
  const pieces = [
    `Emp. ${produto.idempresa}`,
    `Prod. ${produto.idproduto}/${produto.idsubproduto}`,
    produto.nrcodbarprod ? `EAN ${produto.nrcodbarprod}` : null,
  ].filter(Boolean)

  return pieces.join(' | ')
}
