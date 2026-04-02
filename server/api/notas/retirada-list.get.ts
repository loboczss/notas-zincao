import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const allowedStatusRetirada = ['pendente', 'parcial'] as const

const isISODate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const normalizeForSearch = (value: unknown) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const levenshtein = (a: string, b: string) => {
  if (!a) return b.length
  if (!b) return a.length

  const rows = a.length + 1
  const cols = b.length + 1
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))

  for (let i = 0; i < rows; i += 1) matrix[i]![0] = i
  for (let j = 0; j < cols; j += 1) matrix[0]![j] = j

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + custo,
      )
    }
  }

  return matrix[rows - 1]![cols - 1]!
}

const scoreTexto = (search: string, value: string) => {
  const s = normalizeForSearch(search)
  const v = normalizeForSearch(value)
  if (!s || !v) return 0

  if (v === s) return 1
  if (v.startsWith(s)) return 0.95
  if (v.includes(s)) return 0.9

  const tokens = s.split(' ').filter(Boolean)
  if (tokens.length && tokens.every(token => v.includes(token))) {
    return 0.82
  }

  const dist = levenshtein(s, v)
  const maxLen = Math.max(s.length, v.length)
  const aproximacao = maxLen ? 1 - (dist / maxLen) : 0

  return aproximacao >= 0.5 ? Number(aproximacao.toFixed(3)) : 0
}

const scoreNota = (search: string, nota: any) => {
  const nome = String(nota?.nome_cliente || '')
  const numero = String(nota?.numero_nota || '')
  const serieNumero = `${nota?.serie_nota || ''}-${numero}`

  return Math.max(
    scoreTexto(search, nome),
    scoreTexto(search, numero),
    scoreTexto(search, serieNumero),
  )
}

const normalizeSearch = (value: unknown) => {
  return String(value || '')
    .trim()
    .replace(/[,%]/g, ' ')
    .replace(/\s+/g, ' ')
}

export const notasRetiradaListGetHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const client = await serverSupabaseClient(event)
  const query = getQuery(event)
  const search = normalizeSearch(query.search)
  const status = String(query.status || '').trim().toLowerCase()
  const dataInicio = String(query.data_inicio || query.date_from || '').trim()
  const dataFim = String(query.data_fim || query.date_to || '').trim()

  let request = (client as any)
    .from('notas_retirada')
    .select('id, contato_id, nome_cliente, numero_nota, serie_nota, data_compra, data_retirada, valor_total, desconto_total, status_retirada, criado_em, produtos, foto_url, foto_cliente_url, comprovante_retirada_url, historico_retiradas')
    .in('status_retirada', ['pendente', 'parcial'])
    .order('criado_em', { ascending: false })

  if ((allowedStatusRetirada as readonly string[]).includes(status)) {
    request = request.eq('status_retirada', status)
  }

  if (isISODate(dataInicio)) {
    request = request.gte('data_compra', dataInicio)
  }

  if (isISODate(dataFim)) {
    request = request.lte('data_compra', dataFim)
  }

  const { data, error } = await request

  if (error) {
    console.error('[api/notas/retirada-list] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível listar as notas para retirada.',
    })
  }

  const notasBase = (data || []) as any[]
  const notasFiltradas = search
    ? notasBase
      .map((nota) => ({ nota, score: scoreNota(search, nota) }))
      .filter(item => item.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .map(item => item.nota)
    : notasBase

  return {
    success: true,
    notas: notasFiltradas,
  }
})

export default notasRetiradaListGetHandler
