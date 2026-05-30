import { DEFAULT_MAX_PAGES } from './constants'
import { fetchIntegrimAllPages } from './integrim-client'
import type {
  FetchSourceResult,
  IntegrimClause,
  IntegrimConfig,
  IntegrimRecord,
} from './types'
import { toInteger } from './utils'

const getProductRange = (rows: IntegrimRecord[]) => {
  const ids = rows
    .map(row => toInteger(row.idproduto))
    .filter((id): id is number => id !== null)

  if (!ids.length) return null

  return {
    min: Math.min(...ids),
    max: Math.max(...ids),
  }
}

export const fetchSourceDataForSaldoPage = async (
  config: IntegrimConfig,
  token: string,
  idempresa: number,
  saldos: IntegrimRecord[],
): Promise<FetchSourceResult> => {
  const range = getProductRange(saldos)
  if (!range) {
    return {
      cadProdutos: [],
      precos: [],
      saldos,
    }
  }

  const rangeClauses: IntegrimClause[] = [
    { campo: 'idproduto', operadorlogico: 'AND', operador: 'BETWEEN', valor: [range.min, range.max] },
  ]

  const [cadProdutos, precos] = await Promise.all([
    fetchIntegrimAllPages<IntegrimRecord>(
      config,
      token,
      'cad_produtos',
      rangeClauses,
      [{ campo: 'idproduto', direcao: 'ASC' }],
      DEFAULT_MAX_PAGES,
    ),
    fetchIntegrimAllPages<IntegrimRecord>(
      config,
      token,
      'precos_custos_produtos_empresa',
      [
        { campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: idempresa },
        ...rangeClauses,
      ],
      [{ campo: 'idproduto', direcao: 'ASC' }],
      DEFAULT_MAX_PAGES,
    ),
  ])

  return { cadProdutos, precos, saldos }
}
