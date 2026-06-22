import type { IntegrimNotasSyncResponse } from '../../../../shared/types/IntegrimNotas'
import { createAdminClient, getRunningSyncRun } from './repository'
import { runIntegrimNotasSync } from './runner'
import { runIntegrimVendaDiaBackfill } from './venda-dia-backfill'
import type { IntegrimNotasSyncOptions } from './types'

export type IntegrimNotasSyncStartResult = IntegrimNotasSyncResponse & {
  started: boolean
  already_running: boolean
  status: 'running'
}

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Dispara a sincronizacao das notas do Integrim em segundo plano e responde assim
 * que o run e criado, sem segurar a requisicao HTTP ate o fim do job. O trabalho
 * pesado continua no processo do servidor (como a rotina noturna) e o front
 * acompanha o progresso pelo endpoint de status.
 */
export const startIntegrimNotasSyncInBackground = async (
  options: IntegrimNotasSyncOptions = {},
): Promise<IntegrimNotasSyncStartResult> => {
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
      notas_total: numberValue(running.notas_total),
      itens_total: numberValue(running.itens_total),
      upserted_rows: numberValue(running.upserted_rows),
      deactivated_rows: numberValue(running.deactivated_rows),
      companies: [],
    }
  }

  return await new Promise<IntegrimNotasSyncStartResult>((resolve, reject) => {
    let settled = false

    const task = runIntegrimNotasSync({
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
          notas_total: 0,
          itens_total: 0,
          upserted_rows: 0,
          deactivated_rows: 0,
          companies: [],
        })
      },
    })

    task.catch((error) => {
      console.error('[integrim-notas] background sync failed:', error instanceof Error ? error.message : error)
      if (!settled) {
        settled = true
        reject(error)
      }
    })
  })
}

export const startIntegrimVendaDiaBackfillInBackground = async (
  options: IntegrimNotasSyncOptions = {},
): Promise<IntegrimNotasSyncStartResult> => {
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
      notas_total: numberValue(running.notas_total),
      itens_total: numberValue(running.itens_total),
      upserted_rows: numberValue(running.upserted_rows),
      deactivated_rows: numberValue(running.deactivated_rows),
      companies: [],
    }
  }

  return await new Promise<IntegrimNotasSyncStartResult>((resolve, reject) => {
    let settled = false

    const task = runIntegrimVendaDiaBackfill({
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
          notas_total: 0,
          itens_total: 0,
          upserted_rows: 0,
          deactivated_rows: 0,
          companies: [],
        })
      },
    })

    task.catch((error) => {
      console.error('[integrim-notas] venda dia backfill failed:', error instanceof Error ? error.message : error)
      if (!settled) {
        settled = true
        reject(error)
      }
    })
  })
}
