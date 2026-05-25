import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import {
  carregarRetiradasHistorico,
  normalizeRetiradaFilters,
  roundRetiradaNumber,
} from '../../../services/retiradas-historico'
import type { RetiradaHistoricoEvento } from '../../../../shared/types/RetiradasHistorico'

const escapeCsv = (value: unknown) => {
  const text = String(value ?? '-')
  return /[,"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

const formatDateTime = (value: string) => {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return { date: '-', time: '-' }
  }

  return {
    date: parsed.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    time: parsed.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

const getEventoQuantidadeTotal = (evento: RetiradaHistoricoEvento) => {
  return roundRetiradaNumber((evento.itens || []).reduce((total, item) => {
    return total + Number(item.quantidade || 0)
  }, 0))
}

const getFilterDescription = (filters: ReturnType<typeof normalizeRetiradaFilters>) => {
  const parts: string[] = []
  if (filters.search) parts.push(`Busca: "${filters.search}"`)
  if (filters.dataInicio && (!filters.dataFim || filters.dataFim === filters.dataInicio)) {
    parts.push(`Dia: ${filters.dataInicio}`)
  }
  else {
    if (filters.dataInicio) parts.push(`Data inicial: ${filters.dataInicio}`)
    if (filters.dataFim) parts.push(`Data final: ${filters.dataFim}`)
  }
  if (filters.horaInicio) parts.push(`Hora inicial: ${filters.horaInicio}`)
  if (filters.horaFim) parts.push(`Hora final: ${filters.horaFim}`)
  return parts.length ? parts.join(' | ') : 'Sem filtros'
}

const buildCsv = (
  historico: RetiradaHistoricoEvento[],
  filters: ReturnType<typeof normalizeRetiradaFilters>,
) => {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const quantidadeTotal = roundRetiradaNumber(historico.reduce((total, evento) => {
    return total + getEventoQuantidadeTotal(evento)
  }, 0))
  const zincoTotal = roundRetiradaNumber(historico.reduce((total, evento) => {
    return total + Number(evento.reducao_zinco_10 || 0)
  }, 0))
  const linhasItens = historico.reduce((total, evento) => total + (evento.itens || []).length, 0)

  const rows = [
    'RELATORIO DE HISTORICO DE RETIRADAS - Notas Zincao',
    `Gerado em: ${now}`,
    `Filtros: ${getFilterDescription(filters)}`,
    '',
    '=== RESUMO ===',
    'Eventos,Linhas de itens,Quantidade total,Zinco',
    [
      historico.length,
      linhasItens,
      formatNumber(quantidadeTotal),
      formatNumber(zincoTotal),
    ].map(escapeCsv).join(','),
    '',
    '=== HISTORICO ===',
    'Data,Hora,Cliente,Nota,Retirado por,Itens,Quantidade total,Zinco,Observacoes',
    ...historico.map((evento) => {
      const date = formatDateTime(evento.data)
      const itens = (evento.itens || [])
        .map(item => `${item.nome}: ${formatNumber(item.quantidade)}`)
        .join('; ')

      return [
        date.date,
        date.time,
        evento.nome_cliente,
        `${evento.serie_nota}-${evento.numero_nota}`,
        evento.responsavel_nome || 'Sistema',
        itens,
        formatNumber(getEventoQuantidadeTotal(evento)),
        formatNumber(Number(evento.reducao_zinco_10 || 0)),
        evento.observacoes || '',
      ].map(escapeCsv).join(',')
    }),
  ]

  return rows.join('\n')
}

const buildPdf = async (
  historico: RetiradaHistoricoEvento[],
  filters: ReturnType<typeof normalizeRetiradaFilters>,
) => {
  let PDFDocument: any

  try {
    const pdfkit = await import('pdfkit')
    PDFDocument = pdfkit.default || pdfkit
  }
  catch (error) {
    console.error('[retiradas-historico/export] pdfkit import error:', error)
    throw new Error('PDF generation not available')
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 40,
      bufferPages: true,
    })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width
    const usableWidth = pageWidth - 80
    const dark = '#1e293b'
    const muted = '#64748b'
    const light = '#f8fafc'
    const border = '#e2e8f0'
    const brand = '#d97706'
    const white = '#ffffff'
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const zincoTotal = roundRetiradaNumber(historico.reduce((total, evento) => {
      return total + Number(evento.reducao_zinco_10 || 0)
    }, 0))

    doc.rect(0, 0, pageWidth, 70).fill(dark)
    doc.fillColor(white).font('Helvetica-Bold').fontSize(17).text('Historico de Retiradas', 40, 16)
    doc.fillColor(brand).font('Helvetica').fontSize(10).text('Notas Zincao', 40, 38)
    doc.fillColor('#cbd5e1').fontSize(8).text(`Gerado em ${now} | ${getFilterDescription(filters)}`, 40, 53, {
      width: usableWidth,
      lineBreak: false,
      ellipsis: true,
    })

    doc.y = 84

    const cards = [
      { label: 'REGISTROS', value: formatNumber(historico.length) },
      { label: 'ZINCO', value: `${formatNumber(zincoTotal)} m2` },
    ]
    const cardWidth = usableWidth / cards.length
    const cardTop = doc.y

    cards.forEach((card, index) => {
      const x = 40 + (index * cardWidth)
      doc.rect(x, cardTop, cardWidth - 6, 44).fillAndStroke(light, border)
      doc.fillColor(muted).font('Helvetica-Bold').fontSize(7).text(card.label, x + 8, cardTop + 8, {
        width: cardWidth - 22,
        lineBreak: false,
      })
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(13).text(card.value, x + 8, cardTop + 23, {
        width: cardWidth - 22,
        lineBreak: false,
        ellipsis: true,
      })
    })

    doc.y = cardTop + 58

    const columns = [
      { label: 'Data', width: 58 },
      { label: 'Hora', width: 42 },
      { label: 'Cliente', width: 130 },
      { label: 'Nota', width: 70 },
      { label: 'Retirado por', width: 95 },
      { label: 'Zinco', width: 60 },
      { label: 'Itens', width: 307 },
    ]
    const rowHeight = 24

    const drawHeader = (y: number) => {
      doc.rect(40, y, usableWidth, rowHeight).fill(dark)
      let x = 40
      doc.fillColor(white).font('Helvetica-Bold').fontSize(7)
      for (const column of columns) {
        doc.text(column.label, x + 4, y + 8, {
          width: column.width - 8,
          lineBreak: false,
          ellipsis: true,
        })
        x += column.width
      }
    }

    drawHeader(doc.y)
    doc.y += rowHeight

    historico.forEach((evento, index) => {
      if (doc.y + rowHeight > doc.page.height - 48) {
        doc.addPage()
        doc.y = 40
        drawHeader(doc.y)
        doc.y += rowHeight
      }

      const y = doc.y
      const date = formatDateTime(evento.data)
      const itens = (evento.itens || [])
        .map(item => item.nome)
        .join('; ')
      const values = [
        date.date,
        date.time,
        evento.nome_cliente || '-',
        `${evento.serie_nota}-${evento.numero_nota}`,
        evento.responsavel_nome || 'Sistema',
        formatNumber(Number(evento.reducao_zinco_10 || 0)),
        itens || '-',
      ]

      doc.rect(40, y, usableWidth, rowHeight).fill(index % 2 === 0 ? white : light)

      let x = 40
      doc.fillColor(dark).font('Helvetica').fontSize(7)
      values.forEach((value, valueIndex) => {
        const column = columns[valueIndex]!
        doc.text(value, x + 4, y + 8, {
          width: column.width - 8,
          lineBreak: false,
          ellipsis: true,
        })
        x += column.width
      })

      doc.y = y + rowHeight
    })

    const pageRange = doc.bufferedPageRange()
    for (let index = 0; index < pageRange.count; index++) {
      doc.switchToPage(pageRange.start + index)
      const footerY = doc.page.height - doc.page.margins.bottom - 10
      doc.fillColor(muted).font('Helvetica').fontSize(7).text(
        `Pagina ${index + 1} de ${pageRange.count} - Notas Zincao`,
        40,
        footerY,
        {
          width: usableWidth,
          height: 10,
          align: 'center',
          lineBreak: false,
        },
      )
    }

    doc.end()
  })
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = await serverSupabaseClient<Database>(event)
  const query = getQuery(event)
  const format = String(query.format || 'csv').trim().toLowerCase()

  if (format !== 'csv' && format !== 'pdf') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Formato invalido. Use csv ou pdf.',
    })
  }

  const filters = normalizeRetiradaFilters({
    search: String(query.search || '').trim(),
    dataInicio: String(query.data_inicio || '').trim(),
    dataFim: String(query.data_fim || '').trim(),
    horaInicio: String(query.hora_inicio || '').trim(),
    horaFim: String(query.hora_fim || '').trim(),
  })

  try {
    const result = await carregarRetiradasHistorico(client as any, {
      ...filters,
      sortKey: String(query.sort_key || 'data').trim(),
      sortOrder: String(query.sort_order || 'desc').trim(),
      paginate: false,
    })

    const dateStr = new Date().toISOString().split('T')[0]

    if (format === 'csv') {
      const csv = buildCsv(result.historico, filters)

      setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
      setHeader(event, 'Content-Disposition', `attachment; filename="historico-retiradas-${dateStr}.csv"`)
      return `\uFEFF${csv}`
    }

    const pdf = await buildPdf(result.historico, filters)

    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="historico-retiradas-${dateStr}.pdf"`)
    return pdf
  }
  catch (error: any) {
    console.error('[api/dashboard/retiradas-historico/export] error:', error?.message || error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel exportar o historico de retiradas.',
    })
  }
})
