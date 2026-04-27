import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

// ── Shared search helpers (mirrors list.get.ts) ───────────────────────────────

const allowedStatus = ['pendente', 'parcial', 'retirada', 'cancelada'] as const

const isISODate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

const normalizeForSearch = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const levenshtein = (a: string, b: string) => {
  if (!a) return b.length
  if (!b) return a.length
  const rows = a.length + 1
  const cols = b.length + 1
  const m: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let i = 0; i < rows; i++) m[i]![0] = i
  for (let j = 0; j < cols; j++) m[0]![j] = j
  for (let i = 1; i < rows; i++)
    for (let j = 1; j < cols; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      m[i]![j] = Math.min(m[i - 1]![j]! + 1, m[i]![j - 1]! + 1, m[i - 1]![j - 1]! + c)
    }
  return m[rows - 1]![cols - 1]!
}

const scoreTexto = (search: string, value: string) => {
  const s = normalizeForSearch(search)
  const v = normalizeForSearch(value)
  if (!s || !v) return 0
  if (v === s) return 1
  if (v.startsWith(s)) return 0.95
  if (v.includes(s)) return 0.9
  const tokens = s.split(' ').filter(Boolean)
  if (tokens.length && tokens.every(t => v.includes(t))) return 0.82
  const dist = levenshtein(s, v)
  const maxLen = Math.max(s.length, v.length)
  const aprox = maxLen ? 1 - dist / maxLen : 0
  return aprox >= 0.5 ? Number(aprox.toFixed(3)) : 0
}

const scoreNota = (search: string, nota: any) =>
  Math.max(
    scoreTexto(search, String(nota?.nome_cliente || '')),
    scoreTexto(search, String(nota?.numero_nota || '')),
    scoreTexto(search, `${nota?.serie_nota || ''}-${nota?.numero_nota || ''}`),
  )

const normalizeSearch = (v: unknown) =>
  String(v || '').trim().replace(/[,%]/g, ' ').replace(/\s+/g, ' ')

// ── Format helpers ────────────────────────────────────────────────────────────

const statusLabel = (s: string) =>
  ({ pendente: 'Pendente', parcial: 'Parcial', retirada: 'Concluída', cancelada: 'Cancelada' }[s] ?? s)

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '-'

const fmtCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const escapeCsv = (value: any) => {
  const s = String(value ?? '-')
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const round2 = (n: number) => Math.round(n * 100) / 100

// ── Nota enrichment ───────────────────────────────────────────────────────────

function enrichNota(nota: any) {
  const produtos = Array.isArray(nota.produtos) ? nota.produtos : []
  const totalComprado = round2(produtos.reduce((a: number, p: any) => a + (Number(p.quantidade) || 0), 0))
  const totalRetirado = round2(produtos.reduce((a: number, p: any) => a + (Number(p.quantidade_retirada) || 0), 0))
  const saldo = Math.max(0, round2(totalComprado - totalRetirado))
  const percentual = totalComprado > 0 ? Math.round((totalRetirado / totalComprado) * 100) : 0
  return { ...nota, _totalComprado: totalComprado, _totalRetirado: totalRetirado, _saldo: saldo, _percentual: percentual }
}

type EnrichedNota = ReturnType<typeof enrichNota>

// ── CSV builder ───────────────────────────────────────────────────────────────

function buildCsv(notas: EnrichedNota[], filters: Record<string, string>): string {
  const now = new Date().toLocaleString('pt-BR')
  const fp: string[] = []
  if (filters.status && filters.status !== 'todos') fp.push(`Status: ${statusLabel(filters.status)}`)
  if (filters.dataInicio) fp.push(`De: ${fmtDate(filters.dataInicio)}`)
  if (filters.dataFim) fp.push(`Até: ${fmtDate(filters.dataFim)}`)
  if (filters.search) fp.push(`Busca: "${filters.search}"`)

  const totalValor = round2(notas.reduce((a, n) => a + (Number(n.valor_total) || 0), 0))
  const countPor = (s: string) => notas.filter(n => n.status_retirada === s).length

  const rows: string[] = [
    'RELATÓRIO DE NOTAS DE RETIRADA — Notas Zincão',
    `Gerado em: ${now}`,
    `Filtros: ${fp.length ? fp.join(' | ') : 'Sem filtros'}`,
    '',
    '=== RESUMO ===',
    'Total,Pendentes,Parciais,Concluídas,Canceladas,Valor Total',
    [
      notas.length,
      countPor('pendente'),
      countPor('parcial'),
      countPor('retirada'),
      countPor('cancelada'),
      escapeCsv(fmtCurrency(totalValor)),
    ].join(','),
    '',
    '=== NOTAS ===',
    'Nº Nota,Série,Cliente,Data Compra,Data Retirada,Valor Total,Status,Qtd Itens,Total Comprado,Total Retirado,Saldo,% Entregue',
    ...notas.map(n =>
      [
        escapeCsv(n.numero_nota ?? '-'),
        escapeCsv(n.serie_nota ?? '-'),
        escapeCsv(n.nome_cliente ?? '-'),
        fmtDate(n.data_compra),
        fmtDate(n.data_retirada),
        escapeCsv(fmtCurrency(n.valor_total)),
        statusLabel(n.status_retirada ?? '-'),
        Array.isArray(n.produtos) ? n.produtos.length : 0,
        n._totalComprado,
        n._totalRetirado,
        n._saldo,
        `${n._percentual}%`,
      ].join(','),
    ),
  ]

  return rows.join('\n')
}

// ── PDF builder ───────────────────────────────────────────────────────────────

async function buildPdf(notas: EnrichedNota[], filters: Record<string, string>): Promise<Buffer> {
  let PDFDocument: any
  try {
    const pdfkit = await import('pdfkit')
    PDFDocument = pdfkit.default || pdfkit
  }
  catch (err) {
    console.error('[buildPdf] Failed to import pdfkit:', err)
    throw new Error('PDF generation not available')
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width - 100
    const AMBER = '#D97706'
    const DARK = '#1e293b'
    const GRAY = '#94a3b8'
    const LIGHT = '#f8fafc'
    const WHITE = '#ffffff'

    const now = new Date().toLocaleString('pt-BR')
    const fp: string[] = []
    if (filters.status && filters.status !== 'todos') fp.push(`Status: ${statusLabel(filters.status)}`)
    if (filters.dataInicio) fp.push(`De: ${fmtDate(filters.dataInicio)}`)
    if (filters.dataFim) fp.push(`Até: ${fmtDate(filters.dataFim)}`)
    if (filters.search) fp.push(`Busca: "${filters.search}"`)
    const filterStr = fp.length ? fp.join(' | ') : 'Sem filtros'

    const totalValor = round2(notas.reduce((a, n) => a + (Number(n.valor_total) || 0), 0))
    const countPor = (s: string) => notas.filter(n => n.status_retirada === s).length

    // ── Header band ──
    doc.rect(0, 0, doc.page.width, 72).fill(DARK)
    doc.fillColor(WHITE).fontSize(18).font('Helvetica-Bold').text('Notas Zincão', 50, 16)
    doc.fillColor(AMBER).fontSize(11).font('Helvetica').text('Relatório de Notas de Retirada', 50, 38)
    doc.fillColor(GRAY).fontSize(8).text(`Gerado em ${now}  |  Filtros: ${filterStr}`, 50, 55)
    doc.y = 86

    // ── Summary cards ──
    const cards = [
      { label: 'TOTAL', value: String(notas.length), color: DARK },
      { label: 'PENDENTES', value: String(countPor('pendente')), color: '#e11d48' },
      { label: 'PARCIAIS', value: String(countPor('parcial')), color: AMBER },
      { label: 'CONCLUÍDAS', value: String(countPor('retirada')), color: '#059669' },
      { label: 'CANCELADAS', value: String(countPor('cancelada')), color: GRAY },
      { label: 'VALOR TOTAL', value: fmtCurrency(totalValor), color: DARK },
    ]
    const cW = W / cards.length
    const cardTop = doc.y
    cards.forEach(({ label, value, color }, i) => {
      const cx = 50 + i * cW
      doc.rect(cx, cardTop, cW - 4, 44).fillAndStroke(LIGHT, '#e2e8f0')
      doc.fillColor(GRAY).fontSize(6).font('Helvetica-Bold')
        .text(label, cx + 6, cardTop + 6, { width: cW - 12, lineBreak: false })
      doc.fillColor(color).fontSize(13).font('Helvetica-Bold')
        .text(value, cx + 6, cardTop + 20, { width: cW - 12, lineBreak: false })
    })
    doc.y = cardTop + 54

    // ── Table columns definition ──
    const cols = [
      { label: 'Nº Nota', w: 58 },
      { label: 'Série', w: 38 },
      { label: 'Cliente', w: 132 },
      { label: 'Compra', w: 58 },
      { label: 'Valor', w: 72 },
      { label: 'Status', w: 62 },
      { label: 'Comprado', w: 55 },
      { label: 'Retirado', w: 55 },
      { label: 'Saldo', w: 48 },
      { label: '% Entregue', w: 54 },
    ]
    const ROW_H = 20

    const drawTableHeader = (y: number) => {
      doc.rect(50, y, W, ROW_H).fill(DARK)
      let cx = 50
      doc.fillColor(WHITE).fontSize(7).font('Helvetica-Bold')
      cols.forEach(col => {
        doc.text(col.label, cx + 4, y + 6, { width: col.w - 8, lineBreak: false })
        cx += col.w
      })
    }

    // First table header
    drawTableHeader(doc.y)
    doc.y += ROW_H

    // ── Data rows ──
    notas.forEach((nota, idx) => {
      if (doc.y + ROW_H > doc.page.height - 55) {
        doc.addPage()
        doc.y = 50
        drawTableHeader(doc.y)
        doc.y += ROW_H
      }

      const rowY = doc.y
      doc.rect(50, rowY, W, ROW_H).fill(idx % 2 === 0 ? WHITE : LIGHT)

      const vals = [
        String(nota.numero_nota ?? '-'),
        String(nota.serie_nota ?? '-'),
        String(nota.nome_cliente ?? '-'),
        fmtDate(nota.data_compra),
        fmtCurrency(nota.valor_total),
        statusLabel(nota.status_retirada ?? '-'),
        String(nota._totalComprado),
        String(nota._totalRetirado),
        String(nota._saldo),
        `${nota._percentual}%`,
      ]

      let cx = 50
      doc.fillColor(DARK).fontSize(7).font('Helvetica')
      vals.forEach((val, ci) => {
        doc.text(val, cx + 4, rowY + 6, { width: cols[ci]!.w - 8, lineBreak: false, ellipsis: true })
        cx += cols[ci]!.w
      })
      doc.y = rowY + ROW_H
    })

    // ── Page footers ──
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i)
      doc.fillColor(GRAY).fontSize(7).font('Helvetica')
        .text(
          `Página ${i + 1} de ${range.count}  —  Notas Zincão`,
          50, doc.page.height - 25,
          { width: W, align: 'center', lineBreak: false },
        )
    }

    doc.end()
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = await serverSupabaseClient(event)
  const q = getQuery(event)

  const format = String(q.format || 'csv').toLowerCase()
  if (format !== 'csv' && format !== 'pdf') {
    throw createError({ statusCode: 400, statusMessage: 'Formato inválido. Use csv ou pdf.' })
  }

  const search = normalizeSearch(q.search)
  const status = String(q.status || '').trim().toLowerCase()
  const dataInicio = String(q.data_inicio || '').trim()
  const dataFim = String(q.data_fim || '').trim()

  let req = (client as any)
    .from('notas_retirada')
    .select('id, nome_cliente, numero_nota, serie_nota, data_compra, data_retirada, valor_total, status_retirada, produtos')
    .is('deleted_at', null)
    .order('criado_em', { ascending: false })

  if ((allowedStatus as readonly string[]).includes(status)) req = req.eq('status_retirada', status)
  if (isISODate(dataInicio)) req = req.gte('data_compra', dataInicio)
  if (isISODate(dataFim)) req = req.lte('data_compra', dataFim)

  const { data, error } = await req
  if (error) throw createError({ statusCode: 500, statusMessage: 'Não foi possível carregar as notas.' })

  const base = (data || []) as any[]
  const filtered = search
    ? base
      .map(n => ({ nota: n, score: scoreNota(search, n) }))
      .filter(x => x.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .map(x => x.nota)
    : base

  const notas = filtered.map(enrichNota)
  const dateStr = new Date().toISOString().split('T')[0]
  const filterContext = { status, dataInicio, dataFim, search }

  if (format === 'csv') {
    const csv = buildCsv(notas, filterContext)
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="notas-zincao-${dateStr}.csv"`)
    return csv
  }

  const pdfBuffer = await buildPdf(notas, filterContext)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="notas-zincao-${dateStr}.pdf"`)
  return pdfBuffer
})
