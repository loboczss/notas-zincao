import type { StockIntegrinSyncResponse } from '../../../../shared/types/StockIntegrin'
import { createAdminClient, getRunningSyncRun } from './repository'
import { runStockIntegrinSync } from './runner'
import type { StockIntegrinSyncOptions } from './types'

export type StockIntegrinSyncStartResult = StockIntegrinSyncResponse & {
  started: boolean
  already_running: boolean
  status: 'running'
}

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Dispara a sincronizacao do Stock Integrin em segundo plano e responde assim que
 * o registro do run e criado, sem segurar a requisicao HTTP ate o fim do job.
 * O trabalho pesado continua no processo do servidor (igual a sincronizacao
 * noturna) e o front acompanha o progresso pelo endpoint de status.
 */
export const startStockIntegrinSyncInBackground = async (
  options: StockIntegrinSyncOptions = {},
): Promise<StockIntegrinSyncStartResult> => {
  const adminClient = createAdminClient()
  const running = await getRunningSyncRun(adminClient)

  if (running) {
    return {
      success: true,
      dry_run: false,
      run_id: String(running.id),
      started: false,
      already_running: true,
      status: 'running',
      cad_produtos_total: numberValue(running.cad_produtos_total),
      precos_total: numberValue(running.precos_total),
      saldos_total: numberValue(running.saldos_total),
      upserted_rows: numberValue(running.upserted_rows),
      deactivated_rows: numberValue(running.deactivated_rows),
      companies: [],
    }
  }

  return await new Promise<StockIntegrinSyncStartResult>((resolve, reject) => {
    let settled = false

    const task = runStockIntegrinSync({
      ...options,
      dryRun: false,
      onStarted: (runId) => {
        if (settled) return
        settled = true
        resolve({
          success: true,
          dry_run: false,
          run_id: runId,
          started: true,
          already_running: false,
          status: 'running',
          cad_produtos_total: 0,
          precos_total: 0,
          saldos_total: 0,
          upserted_rows: 0,
          deactivated_rows: 0,
          companies: [],
        })
      },
    })

    // O run continua rodando depois que a resposta ja foi enviada. O proprio
    // runner registra sucesso/falha na tabela; aqui apenas evitamos rejeicao
    // nao tratada e reportamos erro que ocorra antes do run ser criado.
    task.catch((error) => {
      console.error(
        '[stock-integrin] background sync failed:',
        error instanceof Error ? error.message : error,
      )
      if (!settled) {
        settled = true
        reject(error)
      }
    })
  })
}
