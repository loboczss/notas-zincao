import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '../../../app/types/database.types'
import type { NotaProduto } from '../../../shared/types/NotasRetirada'
import { vincularProdutosAoEstoque } from '../estoque/match-produtos'
import { getOpenAIClient } from './client'
import { getNotaProductsOpenAIConfig } from './nota-config'

const notaProductsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['produtos'],
  properties: {
    produtos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'codigo',
          'nome',
          'quantidade',
          'valor_unitario',
          'valor_total',
          'unidade',
        ],
        properties: {
          codigo: { type: 'string' },
          nome: { type: 'string' },
          quantidade: { type: 'string' },
          valor_unitario: { type: 'string' },
          valor_total: { type: 'string' },
          unidade: { type: 'string' },
        },
      },
    },
  },
} as const

type NotaProductsModelOutput = {
  produtos: unknown
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return undefined

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function normalizeProdutos(input: unknown): NotaProduto[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const row = item as Record<string, unknown>
      const nome = String(row.nome || '').trim()
      if (!nome) return null

      const quantidade = toNumber(row.quantidade)
      const valorUnitario = toNumber(row.valor_unitario)
      const valorTotal = toNumber(row.valor_total)
      const codigo = String(row.codigo || '').trim()
      const unidade = String(row.unidade || '').trim()

      return {
        nome,
        ...(quantidade !== undefined ? { quantidade } : {}),
        ...(valorUnitario !== undefined ? { valor_unitario: valorUnitario } : {}),
        ...(valorTotal !== undefined ? { valor_total: valorTotal } : {}),
        ...(codigo ? { codigo } : {}),
        ...(unidade ? { unidade } : {}),
      }
    })
    .filter((item): item is NotaProduto => item !== null)
}

export async function extractNotaProductsFromImage(
  event: Parameters<typeof useRuntimeConfig>[0],
  imageDataUrl: string,
): Promise<NotaProduto[]> {
  const client = getOpenAIClient(event)
  const config = getNotaProductsOpenAIConfig()

  const response = await client.responses.create({
    model: config.model,
    store: false,
    reasoning: { effort: config.reasoningEffort },
    text: {
      verbosity: 'low',
      format: {
        type: 'json_schema',
        name: 'nota_produtos_fallback',
        strict: true,
        schema: notaProductsSchema as unknown as Record<string, unknown>,
      },
    },
    instructions: [
      'Extraia somente as linhas de produtos visiveis no cupom fiscal.',
      'Nao extraia cliente, chave, numero, serie, pagamento, vendedor, observacoes ou totais gerais.',
      'Preserve nome, codigo, quantidade, unidade, valor unitario e valor total exatamente como aparecem.',
      'Valores devem sair como numero decimal em texto, com ponto como separador decimal e sem simbolo de moeda.',
      'Se nao houver produto legivel, retorne produtos como array vazio. Nao invente itens.',
    ].join(' '),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Leia somente a tabela de produtos/itens desta imagem.',
          },
          {
            type: 'input_image',
            image_url: imageDataUrl,
            detail: config.imageDetail,
          },
        ],
      },
    ],
  })

  if (response.status !== 'completed' || !response.output_text) {
    throw new Error(response.error?.message || 'A leitura dos produtos nao retornou dados.')
  }

  const parsed = JSON.parse(response.output_text) as NotaProductsModelOutput
  const produtos = normalizeProdutos(parsed.produtos)
  if (!produtos.length) return []

  const supabase = await serverSupabaseClient<Database>(event as any)
  return await vincularProdutosAoEstoque(supabase as any, produtos)
}
