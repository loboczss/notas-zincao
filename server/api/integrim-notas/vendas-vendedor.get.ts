import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import type {
  IntegrimVendaVendedor,
  IntegrimVendasVendedorResponse,
} from '../../../shared/types/IntegrimVendasVendedor'
import { parseDate, parsePositiveInteger } from '../../utils/integrim-query'

const monthRange = (now = new Date()) => {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${y}-${pad(m + 1)}-01`
  const end = new Date(Date.UTC(y, m + 1, 0))
  return { start, end: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}` }
}

export default defineEventHandler(async (event): Promise<IntegrimVendasVendedorResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const fallback = monthRange()
  const dateStart = parseDate(query.date_start) || fallback.start
  const dateEnd = parseDate(query.date_end) || fallback.end
  const idempresa = parsePositiveInteger(query.idempresa)

  const { data, error } = await (client as any).rpc('integrim_vendas_por_vendedor', {
    p_date_start: dateStart,
    p_date_end: dateEnd,
    p_idempresa: idempresa,
  })

  if (error) {
    console.error('[api/integrim-notas/vendas-vendedor] error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel carregar as vendas por vendedor.' })
  }

  const rows = (data || []) as Array<Record<string, unknown>>
  const vendedores: IntegrimVendaVendedor[] = rows.map(r => ({
    idvendedor: Number(r.idvendedor || 0),
    nome: String(r.nome || `Vendedor ${r.idvendedor}`),
    faturamento: Number(r.faturamento || 0),
    qtd: Number(r.qtd || 0),
    num_itens: Number(r.num_itens || 0),
    faturamento_ant: Number(r.faturamento_ant || 0),
    variacao_pct: r.variacao_pct === null || r.variacao_pct === undefined ? null : Number(r.variacao_pct),
  }))

  const faturamento = vendedores.reduce((t, v) => t + v.faturamento, 0)
  const faturamentoAnt = vendedores.reduce((t, v) => t + v.faturamento_ant, 0)
  const numItens = vendedores.reduce((t, v) => t + v.num_itens, 0)
  const semVendedor = vendedores.find(v => v.idvendedor === 0)?.faturamento || 0

  return {
    success: true,
    periodo: { date_start: dateStart, date_end: dateEnd },
    idempresa,
    vendedores,
    totais: {
      faturamento: Math.round(faturamento * 100) / 100,
      num_itens: numItens,
      faturamento_ant: Math.round(faturamentoAnt * 100) / 100,
      variacao_pct: faturamentoAnt > 0
        ? Math.round(1000 * (faturamento - faturamentoAnt) / faturamentoAnt) / 10
        : null,
      vendedores: vendedores.filter(v => v.idvendedor !== 0).length,
      faturamento_sem_vendedor: Math.round(semVendedor * 100) / 100,
    },
  }
})
