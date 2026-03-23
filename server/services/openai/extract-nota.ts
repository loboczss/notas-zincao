import type { OpenAINotaExtractionResponse } from '../../../shared/types/OpenAI'
import type { NotaProduto } from '../../../shared/types/NotasRetirada'
import { getOpenAIClient } from './client'

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) {
      return undefined
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function normalizeProdutos(input: unknown): NotaProduto[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const nome = String((item as { nome?: unknown }).nome || '').trim()
      const quantidade = toNumber((item as { quantidade?: unknown }).quantidade)
      const valorUnitario = toNumber((item as { valor_unitario?: unknown }).valor_unitario)
      const unidade = String((item as { unidade?: unknown }).unidade || '').trim()

      if (!nome) {
        return null
      }

      return {
        nome,
        ...(quantidade !== undefined ? { quantidade } : {}),
        ...(valorUnitario !== undefined ? { valor_unitario: valorUnitario } : {}),
        ...(unidade ? { unidade } : {}),
      }
    })
    .filter((item): item is NotaProduto => item !== null)
}

export async function extractNotaFromImage(
  event: Parameters<typeof useRuntimeConfig>[0],
  imageDataUrl: string,
): Promise<OpenAINotaExtractionResponse> {
  const client = getOpenAIClient(event)

  const completion = await client.chat.completions.create({
    model: 'gpt-5.4-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Você extrai dados de nota fiscal de loja de material de construção. Responda APENAS JSON com as chaves: nome_cliente, numero_nota, serie_nota, data_compra (YYYY-MM-DD quando possível), produtos (array de {nome, quantidade, valor_unitario, unidade}), valor_total, missingFields (array com: nome_cliente, numero_nota, serie_nota, data_compra, produtos). Se não souber, retorne vazio.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extraia os dados da nota da imagem.' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw) as {
    nome_cliente?: string
    numero_nota?: string
    serie_nota?: string
    data_compra?: string
    produtos?: unknown
    valor_total?: number | string
    missingFields?: string[]
  }

  const produtos = normalizeProdutos(parsed.produtos)

  const missingFields = [
    !parsed.nome_cliente ? 'nome_cliente' : null,
    !parsed.numero_nota ? 'numero_nota' : null,
    !parsed.serie_nota ? 'serie_nota' : null,
    !parsed.data_compra ? 'data_compra' : null,
    produtos.length === 0 ? 'produtos' : null,
  ].filter((field): field is 'nome_cliente' | 'numero_nota' | 'serie_nota' | 'data_compra' | 'produtos' => Boolean(field))

  return {
    draft: {
      nome_cliente: String(parsed.nome_cliente || '').trim(),
      numero_nota: String(parsed.numero_nota || '').trim(),
      serie_nota: String(parsed.serie_nota || '').trim() || '1',
      data_compra: String(parsed.data_compra || '').trim(),
      produtos,
      ...(toNumber(parsed.valor_total) !== undefined ? { valor_total: toNumber(parsed.valor_total) } : {}),
    },
    missingFields,
  }
}
