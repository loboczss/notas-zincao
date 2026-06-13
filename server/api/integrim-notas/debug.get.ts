// TEMPORARIO: diagnostico da API de notas do Integrim. Remover apos validar.
import { authorizeStockIntegrinAdminOrServiceRole } from '../../utils/stock-integrin-auth'
import { getIntegrimNotasConfig } from '../../services/integrim-notas/sync/config'
import { getFreshAccessToken } from '../../services/integrim-notas/sync/client'
import type {
  IntegrimClause,
  IntegrimOrder,
  IntegrimRecord,
} from '../../services/stock-integrin/sync/types'
import { getWindowRange } from '../../services/integrim-notas/sync/utils'

const post = async (baseUrl: string, token: string, service: string, body: unknown) => {
  const response = await fetch(`${baseUrl}/cisspoder-service/${service}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  })
  const text = await response.text()
  let json: unknown = null
  try { json = JSON.parse(text || '{}') } catch { json = text.slice(0, 300) }
  const data = Array.isArray(json) ? json : (json && typeof json === 'object' && Array.isArray((json as any).data) ? (json as any).data : [])
  return {
    status: response.status,
    count: Array.isArray(data) ? data.length : 0,
    hasNext: Boolean((json as any)?.hasNext),
    total: (json as any)?.total ?? null,
    sampleKeys: data[0] ? Object.keys(data[0] as IntegrimRecord) : [],
    sample: data[0] ?? (Array.isArray(data) ? null : json),
  }
}

const ord: IntegrimOrder[] = [{ campo: 'idplanilha', direcao: 'DESC' }]

export default defineEventHandler(async (event) => {
  await authorizeStockIntegrinAdminOrServiceRole(event, { key: 'integrim-notas:debug', adminLimit: 30, serviceRoleLimit: 30 })
  const config = getIntegrimNotasConfig()
  const token = await getFreshAccessToken(config)
  const { startDate, endDate } = getWindowRange(24)
  const idempresa = Number(getQuery(event).idempresa || config.companyIds[0] || 1)
  const modelo = String(getQuery(event).modelo || '55')

  const base: IntegrimClause[] = [
    { campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: idempresa },
    { campo: 'modelo', operadorlogico: 'AND', operador: 'IGUAL', valor: modelo },
  ]

  const variantes: Record<string, IntegrimClause[]> = {
    sem_data: base,
    maior_menor_igual: [
      ...base,
      { campo: 'dtmovimento', operadorlogico: 'AND', operador: 'MAIOR_IGUAL', valor: startDate },
      { campo: 'dtmovimento', operadorlogico: 'AND', operador: 'MENOR_IGUAL', valor: endDate },
    ],
    between: [
      ...base,
      { campo: 'dtmovimento', operadorlogico: 'AND', operador: 'BETWEEN', valor: [startDate, endDate] },
    ],
    apenas_maior_igual: [
      ...base,
      { campo: 'dtmovimento', operadorlogico: 'AND', operador: 'MAIOR_IGUAL', valor: startDate },
    ],
  }

  const documentos: Record<string, unknown> = {}
  for (const [nome, clausulas] of Object.entries(variantes)) {
    try {
      documentos[nome] = await post(config.baseUrl, token, 'documentos_fiscais_saida', { page: 1, clausulas, ordenacoes: ord })
    }
    catch (error) {
      documentos[nome] = { erro: error instanceof Error ? error.message : String(error) }
    }
  }

  // Testa o tamanho de pagina dos ITENS por data: se aceitar `limit`, o backfill
  // de ~1,5M de itens deixa de exigir milhares de requests.
  const itens: Record<string, unknown> = {}
  const dataClausulas: IntegrimClause[] = [
    { campo: 'idempresa', operadorlogico: 'AND', operador: 'IGUAL', valor: idempresa },
    { campo: 'dtmovimento', operadorlogico: 'AND', operador: 'BETWEEN', valor: [startDate, endDate] },
  ]
  const dataOrd: IntegrimOrder[] = [{ campo: 'idplanilha', direcao: 'ASC' }]

  for (const limit of [0, 1000, 5000]) {
    const nome = limit === 0 ? 'sem_limit' : `limit_${limit}`
    try {
      const body: Record<string, unknown> = { page: 1, clausulas: dataClausulas, ordenacoes: dataOrd }
      if (limit > 0) body.limit = limit
      itens[nome] = await post(config.baseUrl, token, 'itens_documentos_fiscais_saida', body)
    }
    catch (error) {
      itens[nome] = { erro: error instanceof Error ? error.message : String(error) }
    }
  }

  const resumir = (obj: Record<string, unknown>) => Object.fromEntries(
    Object.entries(obj).map(([k, r]) => [k, { status: (r as any)?.status, count: (r as any)?.count, total: (r as any)?.total }]),
  )
  console.info('[integrim-notas:debug] empresa=%s modelo=%s janela=%s..%s', idempresa, modelo, startDate, endDate)
  console.info('[integrim-notas:debug] documentos =>', JSON.stringify(resumir(documentos), null, 2))
  console.info('[integrim-notas:debug] itens =>', JSON.stringify(resumir(itens), null, 2))

  return { idempresa, modelo, startDate, endDate, documentos, itens }
})
