import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import { parsePositiveInteger } from '../../utils/integrim-query'

// Relatório de compras em PDF (gerado no servidor com pdfkit, mesmo padrão do
// export de notas). Escopos: 'geral' (tudo), 'empresa' (uma loja) e 'produto'
// (uma folha com a justificativa + recomendações da IA). Usa a mesma RPC
// integrim_lista_compra da tela, então os números batem exatamente.

type CompraRow = {
  idempresa: number
  idproduto: number
  idsubproduto: number
  descricao: string
  saldo_disponivel: number
  custo_unit: number | null
  demanda_diaria: number
  lead_time_dias: number
  coverage_days: number
  estoque_seguranca: number
  ponto_reposicao: number
  dias_ate_ruptura: number | null
  sugestao_compra: number
  capital_necessario: number
  dinheiro_em_risco: number
}

type AiRec = {
  motivo: string
  compra_extra: number
  confidence: number
  contra_argumento: string | null
  evento_titulo: string | null
}

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const numOrNull = (v: unknown) => (v == null ? null : num(v))

const fmtCurrency = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtNum = (v: number | null | undefined, decimals = 0) =>
  v == null ? '—' : (v).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
const fmtRuptura = (v: number | null) => (v == null ? '—' : `${fmtNum(v, 1)}d`)

const mapRow = (row: Record<string, unknown>): CompraRow => ({
  idempresa: num(row.idempresa),
  idproduto: num(row.idproduto),
  idsubproduto: num(row.idsubproduto),
  descricao: String(row.descricao || ''),
  saldo_disponivel: num(row.saldo_disponivel),
  custo_unit: numOrNull(row.custo_unit),
  demanda_diaria: num(row.demanda_diaria),
  lead_time_dias: num(row.lead_time_dias),
  coverage_days: num(row.coverage_days),
  estoque_seguranca: num(row.estoque_seguranca),
  ponto_reposicao: num(row.ponto_reposicao),
  dias_ate_ruptura: numOrNull(row.dias_ate_ruptura),
  sugestao_compra: num(row.sugestao_compra),
  capital_necessario: num(row.capital_necessario),
  dinheiro_em_risco: num(row.dinheiro_em_risco),
})

const fetchLista = async (
  client: any,
  opts: { idempresa: number | null, onlyBuy: boolean, search: string | null, leadTime: number, coverage: number },
): Promise<CompraRow[]> => {
  const all: CompraRow[] = []
  const pageSize = 200
  let page = 1
  while (page <= 100) {
    const { data, error } = await client.rpc('integrim_lista_compra', {
      p_idempresa: opts.idempresa,
      p_lead_time_dias: opts.leadTime,
      p_coverage_days: opts.coverage,
      p_service_level: 0.95,
      p_horizon_days: 90,
      p_only_buy: opts.onlyBuy,
      p_search: opts.search,
      p_sort: 'risco',
      p_page: page,
      p_page_size: pageSize,
    })
    if (error) throw error
    const rows = (data || []) as Array<Record<string, unknown>>
    if (!rows.length) break
    const total = num(rows[0]?.total_count)
    for (const r of rows) all.push(mapRow(r))
    if (all.length >= total) break
    page += 1
  }
  return all
}

const fetchRecomendacoesIa = async (
  client: any,
  keys: { idempresa: number, idproduto: number, idsubproduto: number },
): Promise<AiRec[]> => {
  const { data, error } = await client
    .from('compra_oportunidades_ia')
    .select('motivo, compra_extra, confidence, contra_argumento, evento_id, status')
    .eq('idempresa', keys.idempresa)
    .eq('idproduto', keys.idproduto)
    .eq('idsubproduto', keys.idsubproduto)
    .not('status', 'in', '("expirada","ignorada")')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error || !data?.length) return []

  const eventoIds = [...new Set((data as any[]).map(r => r.evento_id).filter(Boolean))]
  const titulos = new Map<string, string>()
  if (eventoIds.length) {
    const { data: eventos } = await client
      .from('compra_eventos_contexto')
      .select('id, titulo')
      .in('id', eventoIds)
    for (const e of (eventos || []) as any[]) titulos.set(String(e.id), String(e.titulo || ''))
  }

  return (data as any[]).map(r => ({
    motivo: String(r.motivo || ''),
    compra_extra: num(r.compra_extra),
    confidence: num(r.confidence),
    contra_argumento: r.contra_argumento ? String(r.contra_argumento) : null,
    evento_titulo: r.evento_id ? (titulos.get(String(r.evento_id)) || null) : null,
  }))
}

// ── Paleta ─────────────────────────────────────────────────────────────────
const DARK = '#0f172a'
const BRAND = '#2563eb'
const GRAY = '#94a3b8'
const LIGHT = '#f8fafc'
const WHITE = '#ffffff'
const ROSE = '#e11d48'

const loadPdfKit = async () => {
  try {
    const pdfkit = await import('pdfkit')
    return (pdfkit as any).default || pdfkit
  }
  catch (err) {
    console.error('[relatorio-compra] falha ao importar pdfkit:', err)
    throw createError({ statusCode: 500, statusMessage: 'Geração de PDF indisponível.' })
  }
}

const buildTablePdf = async (rows: CompraRow[], subtitulo: string): Promise<Buffer> => {
  const PDFDocument = await loadPdfKit()
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width - 80
    const now = new Date().toLocaleString('pt-BR')
    const capitalTotal = rows.reduce((a, r) => a + r.capital_necessario, 0)
    const riscoTotal = rows.reduce((a, r) => a + r.dinheiro_em_risco, 0)

    // Cabeçalho
    doc.rect(0, 0, doc.page.width, 66).fill(DARK)
    doc.fillColor(WHITE).fontSize(17).font('Helvetica-Bold').text('Notas Zincão', 40, 14)
    doc.fillColor(BRAND).fontSize(11).font('Helvetica').text(`Relatório de Compras — ${subtitulo}`, 40, 35)
    doc.fillColor(GRAY).fontSize(8).text(`Gerado em ${now}`, 40, 51)
    doc.y = 80

    // Cards resumo
    const cards = [
      { label: 'ITENS PARA COMPRAR', value: fmtNum(rows.length), color: DARK },
      { label: 'CAPITAL NECESSÁRIO', value: fmtCurrency(capitalTotal), color: BRAND },
      { label: 'FATURAMENTO EM RISCO', value: fmtCurrency(riscoTotal), color: ROSE },
    ]
    const cW = W / cards.length
    const cardTop = doc.y
    cards.forEach(({ label, value, color }, i) => {
      const cx = 40 + i * cW
      doc.rect(cx, cardTop, cW - 6, 42).fillAndStroke(LIGHT, '#e2e8f0')
      doc.fillColor(GRAY).fontSize(7).font('Helvetica-Bold').text(label, cx + 8, cardTop + 8, { width: cW - 16, lineBreak: false })
      doc.fillColor(color).fontSize(14).font('Helvetica-Bold').text(value, cx + 8, cardTop + 21, { width: cW - 16, lineBreak: false })
    })
    doc.y = cardTop + 54

    const cols = [
      { label: 'Produto', w: 250, align: 'left' as const },
      { label: 'Emp.', w: 40, align: 'left' as const },
      { label: 'Saldo', w: 60, align: 'right' as const },
      { label: 'Dem/dia', w: 60, align: 'right' as const },
      { label: 'Ruptura', w: 60, align: 'right' as const },
      { label: 'Comprar', w: 65, align: 'right' as const },
      { label: 'Capital', w: 85, align: 'right' as const },
      { label: 'Risco', w: 85, align: 'right' as const },
    ]
    const ROW_H = 18

    const drawHeader = (y: number) => {
      doc.rect(40, y, W, ROW_H).fill(DARK)
      let cx = 40
      doc.fillColor(WHITE).fontSize(7.5).font('Helvetica-Bold')
      cols.forEach((col) => {
        doc.text(col.label, cx + 4, y + 5.5, { width: col.w - 8, align: col.align, lineBreak: false })
        cx += col.w
      })
    }

    drawHeader(doc.y)
    doc.y += ROW_H

    rows.forEach((row, idx) => {
      if (doc.y + ROW_H > doc.page.height - 45) {
        doc.addPage()
        doc.y = 40
        drawHeader(doc.y)
        doc.y += ROW_H
      }
      const rowY = doc.y
      doc.rect(40, rowY, W, ROW_H).fill(idx % 2 === 0 ? WHITE : LIGHT)
      const vals = [
        row.descricao || `${row.idproduto}/${row.idsubproduto}`,
        String(row.idempresa),
        fmtNum(row.saldo_disponivel),
        fmtNum(row.demanda_diaria, 1),
        fmtRuptura(row.dias_ate_ruptura),
        fmtNum(row.sugestao_compra),
        fmtCurrency(row.capital_necessario),
        fmtCurrency(row.dinheiro_em_risco),
      ]
      let cx = 40
      doc.fontSize(7.5).font('Helvetica')
      vals.forEach((val, ci) => {
        const col = cols[ci]!
        doc.fillColor(ci === 7 ? ROSE : DARK)
        doc.text(val, cx + 4, rowY + 5.5, { width: col.w - 8, align: col.align, lineBreak: false, ellipsis: true })
        cx += col.w
      })
      doc.y = rowY + ROW_H
    })

    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i)
      // O rodape fica abaixo da margem inferior; com `width`+`align` o pdfkit passa
      // pelo LineWrapper, ve a posicao alem do maxY e ADICIONA uma pagina em branco
      // por rodape (dobrava o PDF). Zerar a margem inferior evita a paginacao.
      const prevBottom = doc.page.margins.bottom
      doc.page.margins.bottom = 0
      doc.fillColor(GRAY).fontSize(7).font('Helvetica')
        .text(`Página ${i + 1} de ${range.count}  —  Notas Zincão`, 40, doc.page.height - 24, { width: W, align: 'center', lineBreak: false })
      doc.page.margins.bottom = prevBottom
    }
    doc.end()
  })
}

const buildProdutoPdf = async (row: CompraRow, recs: AiRec[]): Promise<Buffer> => {
  const PDFDocument = await loadPdfKit()
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width - 96
    const now = new Date().toLocaleString('pt-BR')

    doc.rect(0, 0, doc.page.width, 74).fill(DARK)
    doc.fillColor(WHITE).fontSize(17).font('Helvetica-Bold').text('Notas Zincão', 48, 16)
    doc.fillColor(BRAND).fontSize(11).font('Helvetica').text('Relatório de Compra — Produto', 48, 38)
    doc.fillColor(GRAY).fontSize(8).text(`Gerado em ${now}`, 48, 54)
    doc.y = 90

    doc.fillColor(DARK).fontSize(15).font('Helvetica-Bold').text(row.descricao || `Produto ${row.idproduto}/${row.idsubproduto}`, 48, doc.y, { width: W })
    doc.moveDown(0.2)
    doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(`Empresa ${row.idempresa} · Código ${row.idproduto}/${row.idsubproduto}`, { width: W })
    doc.moveDown(0.8)

    // KPIs (grid 3x2)
    const kpis = [
      { label: 'SALDO ATUAL', value: `${fmtNum(row.saldo_disponivel)} un`, color: DARK },
      { label: 'DEMANDA / DIA', value: `${fmtNum(row.demanda_diaria, 1)} un`, color: DARK },
      { label: 'DIAS ATÉ RUPTURA', value: fmtRuptura(row.dias_ate_ruptura), color: row.dias_ate_ruptura != null && row.dias_ate_ruptura <= 2 ? ROSE : DARK },
      { label: 'COMPRAR', value: `${fmtNum(row.sugestao_compra)} un`, color: BRAND },
      { label: 'CAPITAL NECESSÁRIO', value: fmtCurrency(row.capital_necessario), color: DARK },
      { label: 'FATURAMENTO EM RISCO', value: fmtCurrency(row.dinheiro_em_risco), color: ROSE },
    ]
    const perRow = 3
    const kW = W / perRow
    const kH = 46
    let ky = doc.y
    kpis.forEach((k, i) => {
      const col = i % perRow
      if (col === 0 && i > 0) ky += kH + 8
      const kx = 48 + col * kW
      doc.rect(kx, ky, kW - 8, kH).fillAndStroke(LIGHT, '#e2e8f0')
      doc.fillColor(GRAY).fontSize(7).font('Helvetica-Bold').text(k.label, kx + 8, ky + 8, { width: kW - 16, lineBreak: false })
      doc.fillColor(k.color).fontSize(14).font('Helvetica-Bold').text(k.value, kx + 8, ky + 22, { width: kW - 16, lineBreak: false })
    })
    doc.y = ky + kH + 18

    // Por que comprar
    const precisa = row.sugestao_compra > 0
    const porque = precisa
      ? `Tem ${fmtNum(row.saldo_disponivel)} un em estoque e vende ~${fmtNum(row.demanda_diaria, 1)}/dia, o que dura ${fmtRuptura(row.dias_ate_ruptura)}. `
        + `O ponto de reposição é ${fmtNum(row.ponto_reposicao)} un (cobre o lead time de ${fmtNum(row.lead_time_dias)} dias mais a segurança de ${fmtNum(row.estoque_seguranca)} un) e o estoque está abaixo dele. `
        + `Compre ${fmtNum(row.sugestao_compra)} un para cobrir ~${fmtNum(row.coverage_days)} dias de venda. Sem repor, o risco é de ${fmtCurrency(row.dinheiro_em_risco)} em faturamento.`
      : `Tem ${fmtNum(row.saldo_disponivel)} un cobrindo ${fmtRuptura(row.dias_ate_ruptura)}, acima do ponto de reposição (${fmtNum(row.ponto_reposicao)} un). Nenhuma compra necessária agora.`

    doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('Por que comprar', 48, doc.y, { width: W })
    doc.moveDown(0.3)
    doc.fillColor('#334155').fontSize(10).font('Helvetica').text(porque, { width: W, align: 'justify', lineGap: 2 })
    doc.moveDown(1)

    // Recomendações da IA
    doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('Recomendações da IA', 48, doc.y, { width: W })
    doc.moveDown(0.3)
    if (!recs.length) {
      doc.fillColor(GRAY).fontSize(9.5).font('Helvetica').text('Sem recomendações da IA para este produto.', { width: W })
    }
    else {
      recs.forEach((rec) => {
        const linhas = [
          `Confiança ${fmtNum(rec.confidence * 100)}%` + (rec.compra_extra > 0 ? `  ·  comprar +${fmtNum(rec.compra_extra)} un` : ''),
          rec.evento_titulo ? `Evento: ${rec.evento_titulo}` : '',
          rec.motivo,
          rec.contra_argumento ? `Atenção: ${rec.contra_argumento}` : '',
        ].filter(Boolean)
        const boxTop = doc.y
        doc.fillColor(BRAND).fontSize(9).font('Helvetica-Bold').text(linhas[0]!, 56, boxTop + 2, { width: W - 16 })
        for (const linha of linhas.slice(1)) {
          doc.fillColor('#334155').fontSize(9.5).font('Helvetica').text(linha, 56, doc.y, { width: W - 16, lineGap: 1 })
        }
        doc.moveDown(0.6)
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(48, doc.y).lineTo(48 + W, doc.y).stroke()
        doc.moveDown(0.4)
      })
    }

    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i)
      // Mesma armadilha do rodape: zerar a margem inferior evita paginas em branco.
      const prevBottom = doc.page.margins.bottom
      doc.page.margins.bottom = 0
      doc.fillColor(GRAY).fontSize(7).font('Helvetica')
        .text(`Notas Zincão  —  Página ${i + 1} de ${range.count}`, 48, doc.page.height - 26, { width: W, align: 'center', lineBreak: false })
      doc.page.margins.bottom = prevBottom
    }
    doc.end()
  })
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const client = await serverSupabaseClient<Database>(event)
  const q = getQuery(event)
  const escopo = String(q.escopo || 'geral').toLowerCase()
  const idempresa = parsePositiveInteger(q.idempresa)

  // Parâmetros salvos (lead time / cobertura) — mesmos defaults da tela.
  const { data: paramRow } = await (client as any)
    .from('integrim_compra_parametros')
    .select('*')
    .eq('id', true)
    .maybeSingle()
  const leadTime = Number(paramRow?.lead_time_dias ?? 7)
  const coverage = Number(paramRow?.coverage_days ?? 30)

  const dateStr = new Date().toISOString().split('T')[0]
  let pdf: Buffer
  let filename: string

  if (escopo === 'produto') {
    const idproduto = parsePositiveInteger(q.idproduto)
    const idsubproduto = Number(q.idsubproduto)
    if (!idempresa || !idproduto || !Number.isFinite(idsubproduto)) {
      throw createError({ statusCode: 400, statusMessage: 'Informe idempresa, idproduto e idsubproduto.' })
    }
    const rows = await fetchLista(client as any, { idempresa, onlyBuy: false, search: String(idproduto), leadTime, coverage })
    const row = rows.find(r => r.idproduto === idproduto && r.idsubproduto === idsubproduto)
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado na análise.' })
    const recs = await fetchRecomendacoesIa(client as any, { idempresa, idproduto, idsubproduto })
    pdf = await buildProdutoPdf(row, recs)
    filename = `relatorio-compra-produto-${idproduto}-${idsubproduto}-${dateStr}.pdf`
  }
  else if (escopo === 'empresa') {
    if (!idempresa) throw createError({ statusCode: 400, statusMessage: 'Informe idempresa.' })
    const rows = await fetchLista(client as any, { idempresa, onlyBuy: true, search: null, leadTime, coverage })
    pdf = await buildTablePdf(rows, `Empresa ${idempresa}`)
    filename = `relatorio-compra-empresa-${idempresa}-${dateStr}.pdf`
  }
  else {
    const rows = await fetchLista(client as any, { idempresa: null, onlyBuy: true, search: null, leadTime, coverage })
    pdf = await buildTablePdf(rows, 'Lista geral')
    filename = `relatorio-compra-geral-${dateStr}.pdf`
  }

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="${filename}"`)
  return pdf
})
