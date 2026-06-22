import type { IntegrimRecord } from '../../stock-integrin/sync/types'
import { toInteger, toNumber } from '../../stock-integrin/sync/utils'
import { normalizeDate, trimmedOrNull } from './utils'

export type ProdutoValorBaseRow = {
  idempresa: number
  idproduto: number
  idsubproduto: number
  descricao: string | null
  qtd_30d: number
  qtd_90d: number
  qtd_180d: number
  qtd_365d: number
  faturamento_30d: number
  faturamento_90d: number
  faturamento_180d: number
  faturamento_365d: number
  num_notas_365d: number
  ultima_venda: string | null
}

export type ProdutoVendaDiaRow = {
  idempresa: number
  idproduto: number
  idsubproduto: number
  venda_data: string
  qtd: number
  faturamento: number
  num_notas: number
}

type Bucket = ProdutoValorBaseRow
type DailyBucket = ProdutoVendaDiaRow

const MS_PER_DAY = 86_400_000

// CFOP de saida (venda): 5xxx/6xxx/7xxx. Entradas/devolucoes (1xxx/2xxx/3xxx) ficam de fora.
const isVendaCfop = (cfop: number | null) => cfop === null || (cfop >= 5000 && cfop < 8000)

/**
 * Acumula vendas por produto em memoria, sem armazenar item a item. Bounded pelo
 * numero de produtos distintos (alguns milhares), nao pelo volume de itens (~1,5M).
 */
export class ProdutoValorAggregator {
  private readonly buckets = new Map<string, Bucket>()
  private readonly dailyBuckets = new Map<string, DailyBucket>()
  private readonly todayMs: number

  constructor(today = new Date()) {
    this.todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  }

  add(record: IntegrimRecord) {
    const idempresa = toInteger(record.idempresa)
    const idproduto = toInteger(record.idproduto)
    const idsubproduto = toInteger(record.idsubproduto)
    if (!idempresa || !idproduto || !idsubproduto) return

    const cfop = toInteger(record.cfop)
    if (!isVendaCfop(cfop)) return

    const date = normalizeDate(record.dtmovimento)
    if (!date) return
    const dateMs = Date.parse(`${date}T00:00:00Z`)
    if (!Number.isFinite(dateMs) || dateMs > this.todayMs) return

    const daysAgo = Math.floor((this.todayMs - dateMs) / MS_PER_DAY)

    const qty = toNumber(record.qtdproduto) ?? 0
    const val = toNumber(record.valtotliquido) ?? 0

    const key = `${idempresa}:${idproduto}:${idsubproduto}`
    let bucket = this.buckets.get(key)
    if (!bucket) {
      bucket = {
        idempresa,
        idproduto,
        idsubproduto,
        descricao: null,
        qtd_30d: 0,
        qtd_90d: 0,
        qtd_180d: 0,
        qtd_365d: 0,
        faturamento_30d: 0,
        faturamento_90d: 0,
        faturamento_180d: 0,
        faturamento_365d: 0,
        num_notas_365d: 0,
        ultima_venda: null,
      }
      this.buckets.set(key, bucket)
    }

    const descricao = trimmedOrNull(record.descrproduto)
    if (descricao && (!bucket.ultima_venda || date >= bucket.ultima_venda)) {
      bucket.descricao = descricao
    }

    if (daysAgo <= 365) {
      bucket.qtd_365d += qty
      bucket.faturamento_365d += val
      bucket.num_notas_365d += 1
      if (daysAgo <= 180) { bucket.qtd_180d += qty; bucket.faturamento_180d += val }
      if (daysAgo <= 90) { bucket.qtd_90d += qty; bucket.faturamento_90d += val }
      if (daysAgo <= 30) { bucket.qtd_30d += qty; bucket.faturamento_30d += val }
    }
    if (!bucket.ultima_venda || date > bucket.ultima_venda) bucket.ultima_venda = date

    const dailyKey = `${key}:${date}`
    let daily = this.dailyBuckets.get(dailyKey)
    if (!daily) {
      daily = {
        idempresa,
        idproduto,
        idsubproduto,
        venda_data: date,
        qtd: 0,
        faturamento: 0,
        num_notas: 0,
      }
      this.dailyBuckets.set(dailyKey, daily)
    }
    daily.qtd += qty
    daily.faturamento += val
    daily.num_notas += 1
  }

  size() {
    return this.buckets.size
  }

  toRows(): ProdutoValorBaseRow[] {
    const round = (n: number, d: number) => Number(n.toFixed(d))
    return [...this.buckets.values()].map(b => ({
      ...b,
      qtd_30d: round(b.qtd_30d, 3),
      qtd_90d: round(b.qtd_90d, 3),
      qtd_180d: round(b.qtd_180d, 3),
      qtd_365d: round(b.qtd_365d, 3),
      faturamento_30d: round(b.faturamento_30d, 2),
      faturamento_90d: round(b.faturamento_90d, 2),
      faturamento_180d: round(b.faturamento_180d, 2),
      faturamento_365d: round(b.faturamento_365d, 2),
    }))
  }

  toDailyRows(): ProdutoVendaDiaRow[] {
    const round = (n: number, d: number) => Number(n.toFixed(d))
    return [...this.dailyBuckets.values()].map(b => ({
      ...b,
      qtd: round(b.qtd, 3),
      faturamento: round(b.faturamento, 2),
    }))
  }
}
