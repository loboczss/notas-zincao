import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import type {
  IntegrimVendaLoja,
  IntegrimVendasLojaResponse,
} from '../../../shared/types/IntegrimVendasLoja'
import { nomeLoja } from '../../../shared/types/IntegrimVendasLoja'
import { parseDate } from '../../utils/integrim-query'

// Primeiro e último dia do mês corrente (fallback quando o front não manda datas).
const monthRange = (now = new Date()) => {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${y}-${pad(m + 1)}-01`
  const end = new Date(Date.UTC(y, m + 1, 0))
  return { start, end: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}` }
}

export default defineEventHandler(async (event): Promise<IntegrimVendasLojaResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const fallback = monthRange()
  const dateStart = parseDate(query.date_start) || fallback.start
  const dateEnd = parseDate(query.date_end) || fallback.end

  const { data, error } = await (client as any).rpc('integrim_vendas_por_loja', {
    p_date_start: dateStart,
    p_date_end: dateEnd,
  })

  if (error) {
    console.error('[api/integrim-notas/vendas-loja] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel carregar as vendas por loja.' })
  }

  const rows = (data || []) as Array<Record<string, unknown>>
  const lojas: IntegrimVendaLoja[] = rows.map(r => ({
    idempresa: Number(r.idempresa || 0),
    nome: nomeLoja(Number(r.idempresa || 0)),
    faturamento: Number(r.faturamento || 0),
    qtd: Number(r.qtd || 0),
    num_notas: Number(r.num_notas || 0),
    faturamento_ant: Number(r.faturamento_ant || 0),
    variacao_pct: r.variacao_pct === null || r.variacao_pct === undefined ? null : Number(r.variacao_pct),
  }))

  const faturamento = lojas.reduce((t, l) => t + l.faturamento, 0)
  const faturamentoAnt = lojas.reduce((t, l) => t + l.faturamento_ant, 0)
  const numNotas = lojas.reduce((t, l) => t + l.num_notas, 0)

  return {
    success: true,
    periodo: { date_start: dateStart, date_end: dateEnd },
    lojas,
    totais: {
      faturamento: Math.round(faturamento * 100) / 100,
      num_notas: numNotas,
      faturamento_ant: Math.round(faturamentoAnt * 100) / 100,
      variacao_pct: faturamentoAnt > 0
        ? Math.round(1000 * (faturamento - faturamentoAnt) / faturamentoAnt) / 10
        : null,
      lojas: lojas.length,
    },
  }
})
