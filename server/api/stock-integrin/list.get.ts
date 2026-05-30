import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import type {
  StockIntegrinLocalEstoque,
  StockIntegrinListResponse,
  StockIntegrinProduto,
  StockIntegrinStats,
} from '../../../shared/types/StockIntegrin'

type QueryFilters = {
  search: string
  idempresa: number | null
  idlocalestoque: number | null
  onlyAvailable: boolean
}

type ParsedStockSearch = {
  text: string
  codeLeft: number | null
  codeRight: number | null
  numericCode: number | null
  barcodeDigits: string | null
}

type StockIntegrinStatsWithTotal = StockIntegrinStats & {
  total_itens: number
}

const STOCK_INTEGRIN_LIST_SELECT = [
  'id',
  'idempresa',
  'idproduto',
  'idsubproduto',
  'idlocalestoque',
  'descrlocalestoque',
  'descrcomproduto',
  'descrresproduto',
  'nrcodbarprod',
  'ncm',
  'embalagem_saida',
  'descrsecao',
  'descrgrupo',
  'descrsubgrupo',
  'valprecovarejo',
  'valpromvarejo',
  'valcustorepos',
  'custogerencial',
  'custonotafiscal',
  'qtdsaldoatual',
  'qtdsaldoreserva',
  'qtdsaldodisponivel',
  'locais_estoque',
  'flaglote',
  'flagestnegativo',
  'flaginativo',
  'cad_produto_dtalteracao',
  'preco_custo_dtalteracao',
  'estoque_dtalteracao',
  'integrim_updated_at',
  'sync_run_id',
  'last_seen_at',
  'is_present',
  'created_at',
  'updated_at',
].join(',')

const parsePositiveInteger = (value: unknown) => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) return null
  const integer = Math.trunc(parsed)
  return integer > 0 ? integer : null
}

const parseBoolean = (value: unknown) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['1', 'true', 'sim', 's', 'yes', 'y'].includes(normalized)
}

const sanitizeLike = (value: string) => {
  return value
    .replace(/[%,()._{}\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const parseSafeIntegerText = (value: string) => {
  if (!/^[0-9]{1,9}$/.test(value)) return null
  return parsePositiveInteger(value)
}

const parseStockSearch = (value: string): ParsedStockSearch => {
  const raw = String(value || '').trim()
  const productCode = raw
    .toLowerCase()
    .replace(/^prod\.?\s*/, '')
    .replace(/[^0-9/]/g, '')
  const digits = raw.replace(/\D/g, '')
  const pairMatch = productCode.match(/^([0-9]{1,9})\/([0-9]{1,9})$/)
  const singleCode = parseSafeIntegerText(productCode) ?? parseSafeIntegerText(digits)
  const codeLeft = pairMatch?.[1] ? parseSafeIntegerText(pairMatch[1]) : null
  const codeRight = pairMatch?.[2] ? parseSafeIntegerText(pairMatch[2]) : null

  return {
    text: sanitizeLike(raw),
    codeLeft,
    codeRight,
    numericCode: singleCode,
    barcodeDigits: digits.length >= 6 ? digits : null,
  }
}

const applyBaseFilters = (request: any, filters: QueryFilters) => {
  let next = request
    .eq('is_present', true)

  if (filters.idempresa) {
    next = next.eq('idempresa', filters.idempresa)
  }

  if (filters.idlocalestoque) {
    next = next.contains('locais_estoque', [{ idlocalestoque: filters.idlocalestoque }])
  }

  if (filters.onlyAvailable) {
    next = next.gt('qtdsaldodisponivel', 0)
  }

  return next
}

const toLocalEstoque = (value: unknown): StockIntegrinLocalEstoque[] => {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(item => ({
      idlocalestoque: Number(item.idlocalestoque || 0),
      descrlocalestoque: item.descrlocalestoque ? String(item.descrlocalestoque) : null,
      qtdsaldoatual: Number(item.qtdsaldoatual || 0),
      qtdsaldoreserva: Number(item.qtdsaldoreserva || 0),
      qtdsaldodisponivel: Number(item.qtdsaldodisponivel || 0),
      flaglote: item.flaglote ? String(item.flaglote) : null,
      flagestnegativo: item.flagestnegativo ? String(item.flagestnegativo) : null,
      flaginativo: item.flaginativo ? String(item.flaginativo) : null,
      dtalteracao: item.dtalteracao ? String(item.dtalteracao) : null,
    }))
}

const toProduto = (row: Record<string, unknown>): StockIntegrinProduto => ({
  id: String(row.id),
  idempresa: Number(row.idempresa || 0),
  idproduto: Number(row.idproduto || 0),
  idsubproduto: Number(row.idsubproduto || 0),
  idlocalestoque: Number(row.idlocalestoque || 0),
  descrlocalestoque: row.descrlocalestoque ? String(row.descrlocalestoque) : null,
  descrcomproduto: String(row.descrcomproduto || ''),
  descrresproduto: row.descrresproduto ? String(row.descrresproduto) : null,
  nrcodbarprod: row.nrcodbarprod ? String(row.nrcodbarprod) : null,
  ncm: row.ncm ? String(row.ncm) : null,
  embalagem_saida: row.embalagem_saida ? String(row.embalagem_saida) : null,
  descrsecao: row.descrsecao ? String(row.descrsecao) : null,
  descrgrupo: row.descrgrupo ? String(row.descrgrupo) : null,
  descrsubgrupo: row.descrsubgrupo ? String(row.descrsubgrupo) : null,
  valprecovarejo: row.valprecovarejo === null || row.valprecovarejo === undefined ? null : Number(row.valprecovarejo),
  valpromvarejo: row.valpromvarejo === null || row.valpromvarejo === undefined ? null : Number(row.valpromvarejo),
  valcustorepos: row.valcustorepos === null || row.valcustorepos === undefined ? null : Number(row.valcustorepos),
  custogerencial: row.custogerencial === null || row.custogerencial === undefined ? null : Number(row.custogerencial),
  custonotafiscal: row.custonotafiscal === null || row.custonotafiscal === undefined ? null : Number(row.custonotafiscal),
  qtdsaldoatual: Number(row.qtdsaldoatual || 0),
  qtdsaldoreserva: Number(row.qtdsaldoreserva || 0),
  qtdsaldodisponivel: Number(row.qtdsaldodisponivel || 0),
  locais_estoque: toLocalEstoque(row.locais_estoque),
  flaglote: row.flaglote ? String(row.flaglote) : null,
  flagestnegativo: row.flagestnegativo ? String(row.flagestnegativo) : null,
  flaginativo: row.flaginativo ? String(row.flaginativo) : null,
  cad_produto_dtalteracao: row.cad_produto_dtalteracao ? String(row.cad_produto_dtalteracao) : null,
  preco_custo_dtalteracao: row.preco_custo_dtalteracao ? String(row.preco_custo_dtalteracao) : null,
  estoque_dtalteracao: row.estoque_dtalteracao ? String(row.estoque_dtalteracao) : null,
  integrim_updated_at: row.integrim_updated_at ? String(row.integrim_updated_at) : null,
  sync_run_id: row.sync_run_id ? String(row.sync_run_id) : null,
  last_seen_at: String(row.last_seen_at || ''),
  is_present: Boolean(row.is_present),
  created_at: String(row.created_at || ''),
  updated_at: String(row.updated_at || ''),
})

const toIntegerArray = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return value
    .map(item => parsePositiveInteger(item))
    .filter((item): item is number => item !== null)
    .sort((a, b) => a - b)
}

const wait = async (ms: number) => {
  await new Promise(resolve => setTimeout(resolve, ms))
}

const toStatsWithTotal = (row: Record<string, unknown> | null | undefined): StockIntegrinStatsWithTotal => ({
  total_itens: Number(row?.total_itens || 0),
  saldo_disponivel_total: Number(row?.saldo_disponivel_total || 0),
  empresas: toIntegerArray(row?.empresas),
  locais: toIntegerArray(row?.locais),
  ultima_sincronizacao: row?.ultima_sincronizacao ? String(row.ultima_sincronizacao) : null,
})

const fetchSummaryStats = async (client: any): Promise<StockIntegrinStatsWithTotal> => {
  const { data, error } = await client
    .from('stock_integrin_summary')
    .select('total_itens,saldo_disponivel_total,empresas,locais,ultima_sincronizacao')
    .eq('id', true)
    .maybeSingle()

  if (error) {
    console.error('[api/stock-integrin/list] summary error:', error.message)
    return {
      total_itens: 0,
      saldo_disponivel_total: 0,
      empresas: [],
      locais: [],
      ultima_sincronizacao: null,
    }
  }

  return toStatsWithTotal((data || {}) as Record<string, unknown>)
}

const fetchFilteredStats = async (
  client: any,
  filters: QueryFilters,
  parsed: ParsedStockSearch,
): Promise<StockIntegrinStatsWithTotal> => {
  const { data, error } = await client
    .rpc('stock_integrin_filter_stats', {
      p_idempresa: filters.idempresa,
      p_idlocalestoque: filters.idlocalestoque,
      p_only_available: filters.onlyAvailable,
      p_code_left: parsed.codeLeft,
      p_code_right: parsed.codeRight,
      p_numeric_code: parsed.numericCode,
      p_barcode_digits: parsed.barcodeDigits,
      p_text: parsed.text,
    })
    .maybeSingle()

  if (error) {
    console.error('[api/stock-integrin/list] filtered stats error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel calcular os indicadores do Stock Integrin.',
    })
  }

  return toStatsWithTotal((data || {}) as Record<string, unknown>)
}

export default defineEventHandler(async (event): Promise<StockIntegrinListResponse> => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page || 1) || 1)
  const pageSize = Math.min(Math.max(Number(query.page_size || query.limit || 50), 1), 200)
  const from = (page - 1) * pageSize
  const to = from + pageSize
  const filters: QueryFilters = {
    search: String(query.search || '').trim(),
    idempresa: parsePositiveInteger(query.idempresa),
    idlocalestoque: parsePositiveInteger(query.idlocalestoque),
    onlyAvailable: parseBoolean(query.only_available),
  }
  const hasActiveFilters = Boolean(filters.search || filters.idempresa || filters.idlocalestoque || filters.onlyAvailable)
  const parsedSearch = parseStockSearch(filters.search)

  const fetchRankedSearchPage = async () => {
    const parsed = parsedSearch
    const fetchLimit = from + pageSize + 1
    const rows: Array<Record<string, unknown>> = []
    const seen = new Set<string>()

    const buildBaseRequest = () => {
      let request = (client as any)
        .from('stock_integrin')
        .select(STOCK_INTEGRIN_LIST_SELECT)

      request = applyBaseFilters(request, filters)

      return request
        .order('idempresa', { ascending: true })
        .order('descrcomproduto', { ascending: true })
        .order('idproduto', { ascending: true })
        .order('idsubproduto', { ascending: true })
        .range(0, fetchLimit - 1)
    }

    const appendPhase = async (buildRequest: (request: any) => any) => {
      if (rows.length > from + pageSize) {
        return {
          added: 0,
          error: null,
        }
      }

      const { data, error } = await buildRequest(buildBaseRequest())
      if (error) {
        return {
          added: 0,
          error,
        }
      }

      let added = 0
      for (const row of ((data || []) as Array<Record<string, unknown>>)) {
        const id = String(row.id || '')
        if (!id || seen.has(id)) continue

        seen.add(id)
        rows.push(row)
        added += 1

        if (rows.length > from + pageSize) break
      }

      return {
        added,
        error: null,
      }
    }

    if (parsed.codeLeft && parsed.codeRight) {
      const { error } = await appendPhase(request => request.eq('idproduto', parsed.codeLeft).eq('idsubproduto', parsed.codeRight))
      return error ? { data: null, error } : { data: rows.slice(from, from + pageSize + 1), error: null }
    }

    if (parsed.numericCode) {
      const exact = await appendPhase(request => request.eq('idproduto', parsed.numericCode).eq('idsubproduto', parsed.numericCode))
      if (exact.error) return { data: null, error: exact.error }

      const anyCode = await appendPhase(request => request.or(`idproduto.eq.${parsed.numericCode},idsubproduto.eq.${parsed.numericCode}`))
      if (anyCode.error) return { data: null, error: anyCode.error }

      if (rows.length > 0) {
        return { data: rows.slice(from, from + pageSize + 1), error: null }
      }
    }

    if (parsed.barcodeDigits) {
      const exact = await appendPhase(request => request.eq('nrcodbarprod', parsed.barcodeDigits))
      if (exact.error) return { data: null, error: exact.error }

      const prefix = await appendPhase(request => request.like('nrcodbarprod', `${parsed.barcodeDigits}%`))
      if (prefix.error) return { data: null, error: prefix.error }

      if (rows.length > 0) {
        return { data: rows.slice(from, from + pageSize + 1), error: null }
      }
    }

    const textPhases: Array<(request: any) => any> = []

    if (parsed.text) {
      textPhases.push(request => request.or(`descrcomproduto.ilike.${parsed.text}%,descrresproduto.ilike.${parsed.text}%`))
      textPhases.push(request => request.or([
        `descrcomproduto.ilike.%${parsed.text}%`,
        `descrresproduto.ilike.%${parsed.text}%`,
      ].join(',')))
    }

    for (const phase of textPhases) {
      const { error } = await appendPhase(phase)
      if (error) {
        return { data: null, error }
      }
    }

    return {
      data: rows.slice(from, from + pageSize + 1),
      error: null,
    }
  }

  const fetchDefaultPage = async () => {
    let request = (client as any)
      .from('stock_integrin')
      .select(STOCK_INTEGRIN_LIST_SELECT)
      .order('idempresa', { ascending: true })
      .order('descrcomproduto', { ascending: true })
      .order('idproduto', { ascending: true })
      .order('idsubproduto', { ascending: true })
      .range(from, to)

    request = applyBaseFilters(request, filters)

    return await request
  }

  const fetchPage = filters.search ? fetchRankedSearchPage : fetchDefaultPage
  let { data, error } = await fetchPage()

  if (error) {
    await wait(450)
    const retry = await fetchPage()
    data = retry.data
    error = retry.error
  }

  if (error) {
    console.error('[api/stock-integrin/list] error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel listar o Stock Integrin.',
    })
  }

  const stats = hasActiveFilters
    ? await fetchFilteredStats(client as any, filters, parsedSearch)
    : await fetchSummaryStats(client as any)
  const rows = (data || []) as Array<Record<string, unknown>>
  const hasNext = rows.length > pageSize
  const pageRows = hasNext ? rows.slice(0, pageSize) : rows
  const totalItens = stats.total_itens
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize))

  return {
    success: true,
    produtos: pageRows.map(toProduto),
    meta: {
      page,
      page_size: pageSize,
      total_itens: totalItens,
      total_paginas: totalPaginas,
    },
    stats,
  }
})
