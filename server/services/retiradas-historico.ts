import type {
  RetiradaHistoricoEvento,
  RetiradaHistoricoResumo,
  RetiradaHistoricoSortKey,
  RetiradaHistoricoSortOrder,
} from '../../shared/types/RetiradasHistorico'

type SupabaseLikeClient = {
  from: (table: string) => any
}

export type RetiradasHistoricoFilters = {
  search?: string
  dataInicio?: string
  dataFim?: string
  horaInicio?: string
  horaFim?: string
}

export type RetiradasHistoricoOptions = RetiradasHistoricoFilters & {
  page?: number
  pageSize?: number
  paginate?: boolean
  sortKey?: string
  sortOrder?: string
}

export type RetiradasHistoricoResult = {
  historico: RetiradaHistoricoEvento[]
  resumo: RetiradaHistoricoResumo
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

const RETIRADAS_TIME_ZONE = 'America/Sao_Paulo'
const VALID_SORT_KEYS: RetiradaHistoricoSortKey[] = [
  'data',
  'nome_cliente',
  'itens',
  'quantidade_total',
  'reducao_zinco_10',
]

const isIsoDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
const isHourMinute = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

const normalizeRetiradaText = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const roundRetiradaNumber = (value: number) => Math.round(value * 100) / 100

export const normalizeRetiradaFilters = (filters: RetiradasHistoricoFilters): Required<RetiradasHistoricoFilters> => ({
  search: String(filters.search || '').trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' '),
  dataInicio: isIsoDateOnly(String(filters.dataInicio || '').trim()) ? String(filters.dataInicio).trim() : '',
  dataFim: isIsoDateOnly(String(filters.dataFim || '').trim()) ? String(filters.dataFim).trim() : '',
  horaInicio: isHourMinute(String(filters.horaInicio || '').trim()) ? String(filters.horaInicio).trim() : '',
  horaFim: isHourMinute(String(filters.horaFim || '').trim()) ? String(filters.horaFim).trim() : '',
})

const getZonedEventParts = (value: string) => {
  const parsed = new Date(value)
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: RETIRADAS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]))
  const year = parts.year || '0000'
  const month = parts.month || '00'
  const day = parts.day || '00'
  const hour = Number(parts.hour || 0)
  const minute = Number(parts.minute || 0)

  return {
    date: `${year}-${month}-${day}`,
    minutes: (hour * 60) + minute,
  }
}

const parseTimeToMinutes = (value: string) => {
  if (!isHourMinute(value)) return null
  const [hour, minute] = value.split(':').map(Number)
  return (Number(hour || 0) * 60) + Number(minute || 0)
}

const getEventoQuantidadeTotal = (evento: RetiradaHistoricoEvento) => {
  return (Array.isArray(evento.itens) ? evento.itens : []).reduce((total, item) => {
    return total + Number(item.quantidade || 0)
  }, 0)
}

const matchesFilters = (
  evento: RetiradaHistoricoEvento,
  filters: Required<RetiradasHistoricoFilters>,
) => {
  const eventParts = getZonedEventParts(evento.data)

  const endDate = filters.dataFim || filters.dataInicio

  if (filters.dataInicio && eventParts.date < filters.dataInicio) return false
  if (endDate && eventParts.date > endDate) return false

  const startMinutes = parseTimeToMinutes(filters.horaInicio)
  const endMinutes = parseTimeToMinutes(filters.horaFim)

  if (startMinutes !== null && endMinutes !== null) {
    const inRange = startMinutes <= endMinutes
      ? eventParts.minutes >= startMinutes && eventParts.minutes <= endMinutes
      : eventParts.minutes >= startMinutes || eventParts.minutes <= endMinutes

    if (!inRange) return false
  }
  else if (startMinutes !== null && eventParts.minutes < startMinutes) {
    return false
  }
  else if (endMinutes !== null && eventParts.minutes > endMinutes) {
    return false
  }

  const search = normalizeRetiradaText(filters.search)
  if (!search) return true

  const searchable = normalizeRetiradaText([
    evento.nome_cliente,
    evento.numero_nota,
    `${evento.serie_nota}-${evento.numero_nota}`,
    evento.responsavel_nome,
    evento.observacoes,
    ...(evento.itens || []).map(item => item.nome),
  ].join(' '))

  return search.split(' ').filter(Boolean).every(term => searchable.includes(term))
}

const getResumo = (historico: RetiradaHistoricoEvento[]): RetiradaHistoricoResumo => {
  return historico.reduce<RetiradaHistoricoResumo>((resumo, evento) => {
    const itens = Array.isArray(evento.itens) ? evento.itens : []

    resumo.eventos += 1
    resumo.itens += itens.length
    resumo.quantidade_total += getEventoQuantidadeTotal(evento)
    resumo.reducao_zinco_10 += Number(evento.reducao_zinco_10 || 0)

    return resumo
  }, {
    eventos: 0,
    itens: 0,
    quantidade_total: 0,
    reducao_zinco_10: 0,
  })
}

const normalizeSortKey = (sortKey: string | undefined): RetiradaHistoricoSortKey => {
  return VALID_SORT_KEYS.includes(sortKey as RetiradaHistoricoSortKey)
    ? sortKey as RetiradaHistoricoSortKey
    : 'data'
}

const normalizeSortOrder = (sortOrder: string | undefined): RetiradaHistoricoSortOrder => {
  return String(sortOrder || '').trim().toLowerCase() === 'asc' ? 'asc' : 'desc'
}

const getSortValue = (evento: RetiradaHistoricoEvento, sortKey: RetiradaHistoricoSortKey) => {
  if (sortKey === 'itens') return Array.isArray(evento.itens) ? evento.itens.length : 0
  if (sortKey === 'quantidade_total') return getEventoQuantidadeTotal(evento)
  if (sortKey === 'data') return new Date(evento.data || '').getTime()
  if (sortKey === 'reducao_zinco_10') return Number(evento.reducao_zinco_10 || 0)

  return String(evento.nome_cliente || '').toLowerCase()
}

export const carregarRetiradasHistorico = async (
  client: SupabaseLikeClient,
  options: RetiradasHistoricoOptions = {},
): Promise<RetiradasHistoricoResult> => {
  const filters = normalizeRetiradaFilters(options)
  const sortKey = normalizeSortKey(options.sortKey)
  const sortOrder = normalizeSortOrder(options.sortOrder)

  const pageRaw = Number(options.page || 1)
  const pageSizeRaw = Number(options.pageSize || 12)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
    ? Math.min(500, Math.trunc(pageSizeRaw))
    : 12

  const { data: produtoBase } = await client
    .from('bd_estoque_geral')
    .select('IDPRODUTO, DESCRICAO, QUANTIDADEESTOQUE, IDPRODUTOPAI, FATORCONVERSAO')
    .eq('IDPRODUTO', 10)
    .maybeSingle()

  const { data: produtosFilhos } = await client
    .from('bd_estoque_geral')
    .select('IDPRODUTO, DESCRICAO, QUANTIDADEESTOQUE, IDPRODUTOPAI, FATORCONVERSAO')
    .eq('IDPRODUTOPAI', 10)

  const produtosRelacionados = [produtoBase, ...((produtosFilhos || []) as any[])].filter(Boolean)
  const conversaoPorId = new Map<number, number>()

  for (const produto of produtosRelacionados) {
    const id = Number(produto.IDPRODUTO || 0)
    if (!id) continue

    if (id === 10) {
      conversaoPorId.set(id, 1)
      continue
    }

    const fator = Number(produto.FATORCONVERSAO || 0)
    conversaoPorId.set(id, fator > 0 ? fator : 1)
  }

  const idsRelacionados = [...conversaoPorId.keys()]
  const notas: any[] = []
  const chunkSize = 500
  let from = 0

  while (true) {
    const { data: notasChunk, error: notasError } = await client
      .from('notas_retirada')
      .select('id, numero_nota, serie_nota, nome_cliente, produtos, historico_retiradas, deleted_at')
      .not('historico_retiradas', 'is', null)
      .is('deleted_at', null)
      .order('id', { ascending: true })
      .range(from, from + chunkSize - 1)

    if (notasError) {
      throw notasError
    }

    const chunk = Array.isArray(notasChunk) ? notasChunk : []
    if (!chunk.length) break

    notas.push(...chunk)
    if (chunk.length < chunkSize) break

    from += chunkSize
  }

  const historicoGlobal: RetiradaHistoricoEvento[] = []

  for (const nota of notas) {
    const historico = Array.isArray(nota.historico_retiradas) ? nota.historico_retiradas : []
    const produtos = Array.isArray(nota.produtos) ? nota.produtos : []

    for (const evento of historico) {
      const itensRetiradosRaw = Array.isArray(evento.itens_retirados) ? evento.itens_retirados : []
      let reducaoZinco10 = 0
      const itens: RetiradaHistoricoEvento['itens'] = []

      for (const it of itensRetiradosRaw) {
        const produtoObj = produtos[Number(it.index)]
        if (!produtoObj) continue

        const nome = String(produtoObj.nome || '').trim()
        const quantidade = Number(it.quantidade || 0)
        const idProduto = Number(produtoObj.id_produto_estoque || 0)

        itens.push({
          nome,
          quantidade,
        })

        if (idsRelacionados.includes(idProduto)) {
          const fator = conversaoPorId.get(idProduto) || 1
          reducaoZinco10 += (quantidade * fator)
        }
      }

      if (itens.length > 0) {
        const item: RetiradaHistoricoEvento = {
          id_nota: String(nota.id || ''),
          numero_nota: String(nota.numero_nota || ''),
          serie_nota: String(nota.serie_nota || ''),
          nome_cliente: String(nota.nome_cliente || ''),
          data: evento.data || new Date().toISOString(),
          responsavel_nome: evento.responsavel_nome || 'Sistema',
          observacoes: evento.observacoes || null,
          itens,
          reducao_zinco_10: roundRetiradaNumber(reducaoZinco10),
        }

        if (matchesFilters(item, filters)) {
          historicoGlobal.push(item)
        }
      }
    }
  }

  const resumo = getResumo(historicoGlobal)
  resumo.quantidade_total = roundRetiradaNumber(resumo.quantidade_total)
  resumo.reducao_zinco_10 = roundRetiradaNumber(resumo.reducao_zinco_10)

  historicoGlobal.sort((a, b) => {
    let valA = getSortValue(a, sortKey)
    let valB = getSortValue(b, sortKey)

    if (Number.isNaN(valA)) valA = 0
    if (Number.isNaN(valB)) valB = 0

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const total = historicoGlobal.length
  const shouldPaginate = options.paginate !== false
  const totalPages = shouldPaginate ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const safePage = shouldPaginate ? Math.min(page, totalPages) : 1
  const fromIndex = (safePage - 1) * pageSize
  const toIndex = fromIndex + pageSize
  const historico = shouldPaginate ? historicoGlobal.slice(fromIndex, toIndex) : historicoGlobal

  return {
    historico,
    resumo,
    pagination: {
      page: safePage,
      page_size: shouldPaginate ? pageSize : total,
      total,
      total_pages: totalPages,
    },
  }
}
