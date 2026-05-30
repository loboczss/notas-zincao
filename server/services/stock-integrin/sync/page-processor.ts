import type { StockIntegrinProduto } from '../../../../shared/types/StockIntegrin'
import { buildUpsertRows, stripRawFields } from './mapper'
import { upsertRows, createAdminClient } from './repository'
import { fetchSourceDataForSaldoPage } from './source-fetcher'
import type {
  IntegrimConfig,
  IntegrimRecord,
} from './types'
import {
  addUniqueKeys,
  priceKey,
  sourceKey,
} from './utils'

export const processSaldoPage = async (
  input: {
    config: IntegrimConfig
    token: string
    runId: string
    idempresa: number
    saldos: IntegrimRecord[]
    dryRun: boolean
    adminClient: ReturnType<typeof createAdminClient> | null
    cadKeys: Set<string>
    precoKeys: Set<string>
    samples: StockIntegrinProduto[]
    beforeChunk?: () => Promise<void>
  },
) => {
  await input.beforeChunk?.()

  const source = await fetchSourceDataForSaldoPage(
    input.config,
    input.token,
    input.idempresa,
    input.saldos,
  )

  addUniqueKeys(input.cadKeys, source.cadProdutos, sourceKey)
  addUniqueKeys(input.precoKeys, source.precos, priceKey)
  await input.beforeChunk?.()

  const rows = buildUpsertRows(source, input.runId)
  const upsertedRows = input.dryRun
    ? rows.length
    : await upsertRows(input.adminClient!, rows, input.beforeChunk)

  if (input.dryRun && input.samples.length < 10) {
    input.samples.push(...rows.slice(0, 10 - input.samples.length).map(stripRawFields))
  }

  return {
    saldos: input.saldos.length,
    upsertedRows,
  }
}
