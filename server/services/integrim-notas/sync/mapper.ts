import type { IntegrimRecord } from '../../stock-integrin/sync/types'
import { toInteger, toNumber } from '../../stock-integrin/sync/utils'
import type { IntegrimNotaUpsertRow } from './types'
import { digitsOnly, normalizeDate, trimmedOrNull } from './utils'

// Identifica a empresa e a planilha (documento) de um registro cru do Integrim.
export const recordIdempresa = (record: IntegrimRecord) => toInteger(record.idempresa)
export const recordIdplanilha = (record: IntegrimRecord) => toInteger(record.idplanilha)

// flagnotacancel = 'F' (false) quando ativa; qualquer marca de verdadeiro = cancelada.
export const isNotaCancelada = (record: IntegrimRecord) => {
  const flag = String(record.flagnotacancel ?? '').trim().toUpperCase()
  return ['T', 'S', '1', 'SIM', 'TRUE', 'V'].includes(flag)
}

export const buildNotaRow = (
  record: IntegrimRecord,
  runId: string,
  nowIso: string,
): IntegrimNotaUpsertRow | null => {
  const idempresa = recordIdempresa(record)
  const idplanilha = recordIdplanilha(record)
  if (!idempresa || !idplanilha) return null

  return {
    idempresa,
    idplanilha,
    numnota: trimmedOrNull(record.numnota),
    serienota: trimmedOrNull(record.serienota),
    modelo: trimmedOrNull(record.modelo),
    nome_cliente: trimmedOrNull(record.nome),
    cnpjcpf: digitsOnly(record.cnpjcpf) || null,
    valcontabil: toNumber(record.valcontabil) ?? null,
    dtmovimento: normalizeDate(record.dtmovimento),
    chave: digitsOnly(record.chave) || null,
    flagnotacancel: trimmedOrNull(record.flagnotacancel),
    raw: record,
    sync_run_id: runId,
    is_present: true,
    last_seen_at: nowIso,
    updated_at: nowIso,
  }
}

