import type { OpenAINotaExtractionResponse } from '../../../shared/types/OpenAI'
import type { NotaMissingField, NotaProduto } from '../../../shared/types/NotasRetirada'
import type { Database } from '../../../app/types/database.types'
import { serverSupabaseClient } from '#supabase/server'
import { vincularProdutosAoEstoque } from '../estoque/match-produtos'
import { getOpenAIClient } from './client'

const NOTA_EXTRACTION_MODEL = 'gpt-5.4-mini'
const NOTA_EXTRACTION_REASONING_EFFORT = 'high'

const notaMissingFields = [
  'nome_cliente',
  'telefone_cliente',
  'documento_cliente',
  'numero_nota',
  'serie_nota',
  'chave_nfe',
  'data_compra',
  'produtos',
] as const satisfies readonly NotaMissingField[]

const notaExtractionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'nome_cliente',
    'telefone_cliente',
    'documento_cliente',
    'numero_nota',
    'serie_nota',
    'chave_nfe',
    'data_compra',
    'valor_total',
    'desconto_total',
    'observacoes',
    'produtos',
    'missingFields',
  ],
  properties: {
    nome_cliente: { type: 'string' },
    telefone_cliente: { type: 'string' },
    documento_cliente: { type: 'string' },
    numero_nota: { type: 'string' },
    serie_nota: { type: 'string' },
    chave_nfe: { type: 'string' },
    data_compra: { type: 'string' },
    valor_total: { type: 'string' },
    desconto_total: { type: 'string' },
    observacoes: { type: 'string' },
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
          'desconto',
          'unidade',
          'observacoes',
        ],
        properties: {
          codigo: { type: 'string' },
          nome: { type: 'string' },
          quantidade: { type: 'string' },
          valor_unitario: { type: 'string' },
          valor_total: { type: 'string' },
          desconto: { type: 'string' },
          unidade: { type: 'string' },
          observacoes: { type: 'string' },
        },
      },
    },
    missingFields: {
      type: 'array',
      items: {
        type: 'string',
        enum: notaMissingFields,
      },
    },
  },
} as const

type NotaExtractionModelOutput = {
  nome_cliente: string
  telefone_cliente: string
  documento_cliente: string
  numero_nota: string
  serie_nota: string
  chave_nfe: string
  data_compra: string
  valor_total: string
  desconto_total: string
  observacoes: string
  produtos: unknown
  missingFields: string[]
}

function isNotaMissingField(field: string): field is NotaMissingField {
  return notaMissingFields.includes(field as NotaMissingField)
}

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
      const valorTotal = toNumber((item as { valor_total?: unknown }).valor_total)
      const desconto = toNumber((item as { desconto?: unknown }).desconto)
      const codigo = String((item as { codigo?: unknown }).codigo || '').trim()
      const unidade = String((item as { unidade?: unknown }).unidade || '').trim()
      const observacoes = String((item as { observacoes?: unknown }).observacoes || '').trim()

      if (!nome) {
        return null
      }

      return {
        nome,
        ...(quantidade !== undefined ? { quantidade } : {}),
        ...(valorUnitario !== undefined ? { valor_unitario: valorUnitario } : {}),
        ...(valorTotal !== undefined ? { valor_total: valorTotal } : {}),
        ...(desconto !== undefined ? { desconto } : {}),
        ...(codigo ? { codigo } : {}),
        ...(unidade ? { unidade } : {}),
        ...(observacoes ? { observacoes } : {}),
      }
    })
    .filter((item): item is NotaProduto => item !== null)
}

export async function extractNotaFromImage(
  event: Parameters<typeof useRuntimeConfig>[0],
  imageDataUrl: string,
): Promise<OpenAINotaExtractionResponse> {
  const client = getOpenAIClient(event)

  const response = await client.responses.create({
    model: NOTA_EXTRACTION_MODEL,
    store: false,
    reasoning: { effort: NOTA_EXTRACTION_REASONING_EFFORT },
    text: {
      verbosity: 'low',
      format: {
        type: 'json_schema',
        name: 'nota_fiscal_retirada',
        strict: true,
        schema: notaExtractionSchema as unknown as Record<string, unknown>,
      },
    },
    instructions: [
      'Voce extrai dados de nota fiscal, DANFE, cupom fiscal, NFC-e ou comprovante de compra de loja de material de construcao.',
      'Prioridade maxima: precisao visual. Leia cada campo impresso com cuidado, incluindo cabecalho, dados do cliente, dados fiscais, totais e todos os itens/produtos.',
      'Retorne somente dados realmente visiveis ou inferencias muito seguras. Se um campo estiver ausente, cortado, borrado, ilegivel ou ambiguo, retorne string vazia e inclua o campo em missingFields quando ele for obrigatorio.',
      'Datas devem sair em YYYY-MM-DD quando a data for encontrada. Valores monetarios devem sair como numero decimal em texto, usando ponto como separador decimal e sem simbolo de moeda.',
      'CPF, CNPJ, telefone e chave NFe devem sair somente com numeros. A chave NFe deve ter 44 digitos quando estiver legivel.',
      'Para produtos, extraia todos os itens visiveis. Preserve nomes completos, codigos, unidade, quantidade, valor unitario, valor total, desconto do item e observacoes quando existirem.',
      'Nao invente produto, valor, documento, chave, telefone, serie ou numero de nota. Quando houver conflito entre subtotal e itens, mantenha o que esta impresso e descreva a divergencia em observacoes.',
    ].join(' '),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Extraia a nota fiscal desta imagem com o maximo de detalhe e preencha exatamente o schema solicitado.',
          },
          {
            type: 'input_image',
            image_url: imageDataUrl,
            detail: 'original',
          },
        ],
      },
    ],
  })

  if (response.status !== 'completed' || !response.output_text) {
    throw new Error(response.error?.message || 'A leitura da nota nao retornou dados completos.')
  }

  const parsed = JSON.parse(response.output_text) as NotaExtractionModelOutput
  const produtos = normalizeProdutos(parsed.produtos)
  const supabase = await serverSupabaseClient<Database>(event as any)
  const produtosComEstoque = await vincularProdutosAoEstoque(supabase as any, produtos)
  const modelMissingFields = parsed.missingFields.filter(isNotaMissingField)

  const requiredMissingFields = [
    !parsed.nome_cliente ? 'nome_cliente' : null,
    !parsed.telefone_cliente ? 'telefone_cliente' : null,
    !parsed.documento_cliente ? 'documento_cliente' : null,
    !parsed.numero_nota ? 'numero_nota' : null,
    !parsed.serie_nota ? 'serie_nota' : null,
    !parsed.chave_nfe ? 'chave_nfe' : null,
    !parsed.data_compra ? 'data_compra' : null,
    produtosComEstoque.length === 0 ? 'produtos' : null,
  ].filter((field): field is NotaMissingField => Boolean(field))

  const missingFields = Array.from(new Set([...modelMissingFields, ...requiredMissingFields]))

  return {
    draft: {
      nome_cliente: parsed.nome_cliente.trim(),
      telefone_cliente: parsed.telefone_cliente.trim(),
      documento_cliente: parsed.documento_cliente.trim(),
      numero_nota: parsed.numero_nota.trim(),
      serie_nota: parsed.serie_nota.trim() || '1',
      chave_nfe: parsed.chave_nfe.trim(),
      data_compra: parsed.data_compra.trim(),
      observacoes: parsed.observacoes.trim(),
      produtos: produtosComEstoque,
      ...(toNumber(parsed.valor_total) !== undefined ? { valor_total: toNumber(parsed.valor_total) } : {}),
      ...(toNumber(parsed.desconto_total) !== undefined ? { desconto_total: toNumber(parsed.desconto_total) } : {}),
    },
    missingFields,
  }
}
