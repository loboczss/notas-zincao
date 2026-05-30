import type { StockIntegrinProduto } from '../../../../shared/types/StockIntegrin'
import type {
  FetchSourceResult,
  IntegrimRecord,
  StockIntegrinLocalEstoque,
  StockIntegrinUpsertRow,
} from './types'
import {
  maxTimestamp,
  priceKey,
  sourceKey,
  stringOrNull,
  timestampOrNull,
  toInteger,
  toNumber,
} from './utils'

const toLookupMap = (rows: IntegrimRecord[], getKey: (row: IntegrimRecord) => string | null) => {
  const map = new Map<string, IntegrimRecord>()

  for (const row of rows) {
    const key = getKey(row)
    if (key) map.set(key, row)
  }

  return map
}

const groupSaldosByProduct = (saldos: IntegrimRecord[]) => {
  const groups = new Map<string, IntegrimRecord[]>()

  for (const saldo of saldos) {
    const key = sourceKey(saldo)
    const idempresa = toInteger(saldo.idempresa)
    if (!key || !idempresa) continue

    const groupKey = `${idempresa}:${key}`
    groups.set(groupKey, [...(groups.get(groupKey) || []), saldo])
  }

  return groups
}

const toLocalEstoque = (saldo: IntegrimRecord): StockIntegrinLocalEstoque => ({
  idlocalestoque: toInteger(saldo.idlocalestoque) ?? 0,
  descrlocalestoque: stringOrNull(saldo.descrlocalestoque),
  qtdsaldoatual: toNumber(saldo.qtdsaldoatual) ?? 0,
  qtdsaldoreserva: toNumber(saldo.qtdsaldoreserva) ?? 0,
  qtdsaldodisponivel: toNumber(saldo.qtdsaldodisponivel) ?? 0,
  flaglote: stringOrNull(saldo.flaglote),
  flagestnegativo: stringOrNull(saldo.flagestnegativo),
  flaginativo: stringOrNull(saldo.flaginativo),
  dtalteracao: timestampOrNull(saldo.dtalteracao),
})

const sumLocal = (locais: StockIntegrinLocalEstoque[], key: 'qtdsaldoatual' | 'qtdsaldoreserva' | 'qtdsaldodisponivel') => {
  return Number(locais.reduce((total, local) => total + Number(local[key] || 0), 0).toFixed(3))
}

const flagAnyTrue = (locais: StockIntegrinLocalEstoque[], key: 'flaglote' | 'flagestnegativo') => {
  return locais.some(local => String(local[key] || '').toUpperCase() === 'T') ? 'T' : 'F'
}

const localDescription = (locais: StockIntegrinLocalEstoque[]) => {
  if (locais.length === 1) return locais[0]?.descrlocalestoque || 'Local unico'
  return 'Todos os locais'
}

export const buildUpsertRows = (
  source: FetchSourceResult,
  runId: string,
): StockIntegrinUpsertRow[] => {
  const now = new Date().toISOString()
  const cadByKey = toLookupMap(source.cadProdutos, sourceKey)
  const precoByKey = toLookupMap(source.precos, priceKey)
  const rows: StockIntegrinUpsertRow[] = []
  const groups = groupSaldosByProduct(source.saldos)

  for (const saldos of groups.values()) {
    const firstSaldo = saldos[0] || {}
    const idempresa = toInteger(firstSaldo.idempresa)
    const idproduto = toInteger(firstSaldo.idproduto)
    const idsubproduto = toInteger(firstSaldo.idsubproduto)
    if (!idempresa || !idproduto || !idsubproduto) continue

    const itemKey = `${idproduto}:${idsubproduto}`
    const cadProduto = cadByKey.get(itemKey) || {}
    const preco = precoByKey.get(`${idempresa}:${itemKey}`) || {}
    const nomeProduto = stringOrNull(cadProduto.descrcomproduto)
      || stringOrNull(cadProduto.descrresproduto)
      || `Produto ${idproduto}/${idsubproduto}`
    const locais = saldos
      .map(toLocalEstoque)
      .sort((left, right) => left.idlocalestoque - right.idlocalestoque)
    const estoqueDtalteracao = maxTimestamp(...saldos.map(saldo => saldo.dtalteracao))

    rows.push({
      idempresa,
      idproduto,
      idsubproduto,
      idlocalestoque: 0,
      descrlocalestoque: localDescription(locais),
      descrcomproduto: nomeProduto,
      descrresproduto: stringOrNull(cadProduto.descrresproduto),
      nrcodbarprod: stringOrNull(preco.nrcodbarprod) || stringOrNull(cadProduto.nrcodbarprod),
      ncm: stringOrNull(cadProduto.ncm),
      embalagem_saida: stringOrNull(cadProduto.embalagemsaida),
      descrsecao: stringOrNull(cadProduto.descrsecao),
      descrgrupo: stringOrNull(cadProduto.descrgrupo),
      descrsubgrupo: stringOrNull(cadProduto.descrsubgrupo),
      valprecovarejo: toNumber(preco.valprecovarejo),
      valpromvarejo: toNumber(preco.valpromvarejo),
      valcustorepos: toNumber(preco.valcustorepos),
      custogerencial: toNumber(preco.custogerencial),
      custonotafiscal: toNumber(preco.custonotafiscal),
      qtdsaldoatual: sumLocal(locais, 'qtdsaldoatual'),
      qtdsaldoreserva: sumLocal(locais, 'qtdsaldoreserva'),
      qtdsaldodisponivel: sumLocal(locais, 'qtdsaldodisponivel'),
      locais_estoque: locais,
      flaglote: flagAnyTrue(locais, 'flaglote'),
      flagestnegativo: flagAnyTrue(locais, 'flagestnegativo'),
      flaginativo: stringOrNull(preco.flaginativo) || stringOrNull(cadProduto.flaginativo) || 'F',
      cad_produto_dtalteracao: timestampOrNull(cadProduto.dtalteracao),
      preco_custo_dtalteracao: timestampOrNull(preco.dtalteracao),
      estoque_dtalteracao: estoqueDtalteracao,
      integrim_updated_at: maxTimestamp(cadProduto.dtalteracao, preco.dtalteracao, estoqueDtalteracao),
      raw_cad_produto: cadProduto,
      raw_preco_custo: preco,
      raw_saldo_estoque: { locais },
      sync_run_id: runId,
      last_seen_at: now,
      is_present: true,
      updated_at: now,
    })
  }

  return rows
}

export const stripRawFields = (row: StockIntegrinUpsertRow): StockIntegrinProduto => {
  const { raw_cad_produto: _rawCad, raw_preco_custo: _rawPreco, raw_saldo_estoque: _rawSaldo, ...produto } = row

  return {
    ...produto,
    id: '',
    created_at: produto.updated_at,
  }
}
