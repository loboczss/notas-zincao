import type { NotaIntegrimLookupHints } from '../../../shared/types/NotasRetirada'
import { parseNfeKey } from '../../../shared/utils/nfe-chave'
import { getOpenAIClient } from './client'
import { getNotaLookupOpenAIConfig } from './nota-config'

const notaLookupMissingFields = [
  'numero_nota',
  'serie_nota',
  'chave_nfe',
] as const

const notaLookupSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'numero_nota',
    'serie_nota',
    'chave_nfe',
    'chave_referenciada',
    'documento_cliente',
    'valor_total',
    'data_emissao',
    'missingFields',
  ],
  properties: {
    numero_nota: { type: 'string' },
    serie_nota: { type: 'string' },
    chave_nfe: { type: 'string' },
    chave_referenciada: { type: 'string' },
    documento_cliente: { type: 'string' },
    valor_total: { type: 'string' },
    data_emissao: { type: 'string' },
    missingFields: {
      type: 'array',
      items: {
        type: 'string',
        enum: notaLookupMissingFields,
      },
    },
  },
} as const

type NotaLookupModelOutput = {
  numero_nota: string
  serie_nota: string
  chave_nfe: string
  chave_referenciada: string
  documento_cliente: string
  valor_total: string
  data_emissao: string
  missingFields: string[]
}

const digitsOnly = (value: unknown) => String(value || '').replace(/\D/g, '')

const normalizeSerie = (value: unknown) => {
  return String(value || '')
    .trim()
    .replace(/[^\w-]/g, '')
}

const normalizeDate = (value: unknown) => {
  const raw = String(value || '').trim()
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso?.[1]) return iso[1]
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return ''
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.').trim()
    if (!normalized) return undefined
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const isLookupMissingField = (field: string): field is NotaIntegrimLookupHints['missingFields'][number] => {
  return notaLookupMissingFields.includes(field as NotaIntegrimLookupHints['missingFields'][number])
}

export async function extractNotaLookupHintsFromImage(
  event: Parameters<typeof useRuntimeConfig>[0],
  imageDataUrl: string,
): Promise<NotaIntegrimLookupHints> {
  const client = getOpenAIClient(event)
  const config = getNotaLookupOpenAIConfig()

  const response = await client.responses.create({
    model: config.model,
    store: false,
    reasoning: { effort: config.reasoningEffort },
    text: {
      verbosity: 'low',
      format: {
        type: 'json_schema',
        name: 'nota_integrim_lookup_hints',
        strict: true,
        schema: notaLookupSchema as unknown as Record<string, unknown>,
      },
    },
    instructions: [
      'Voce le uma foto de nota fiscal, NFC-e, cupom fiscal ou DANFE apenas para ajudar uma busca em sistema fiscal.',
      'Extraia os identificadores da nota: numero da nota (numero_nota), serie (serie_nota) e chave NFe/NFC-e de 44 digitos (chave_nfe).',
      'Algumas NF-e sao complementares de um cupom (natureza "NOTA DE ECF" ou texto como "NFCE", "CUPOM", "ECF" nas Informacoes/Dados Adicionais). Nesses casos extraia a chave de 44 digitos do cupom/NFC-e referenciado em chave_referenciada (procure por "refNFe", "NFCE/CHAVE", "CUPOM"). Se nao houver referencia, retorne string vazia.',
      'Para ajudar a localizar a venda, extraia tambem: documento_cliente (CNPJ ou CPF do destinatario, somente digitos), valor_total (valor total da nota, numero decimal com ponto, sem moeda) e data_emissao (data de emissao em YYYY-MM-DD).',
      'Nao extraia nomes de produtos, telefone ou nome do cliente. Esses dados serao buscados em outro sistema.',
      'Retorne apenas o que estiver visualmente legivel. Nao invente numero, serie, chave, documento, valor ou data.',
      'numero_nota, chave_nfe, chave_referenciada e documento_cliente devem conter somente digitos. serie_nota deve preservar letras/numeros/hifen quando estiver legivel.',
      'Se um campo estiver ausente, borrado, cortado ou ambiguo, retorne string vazia. Em missingFields inclua apenas numero_nota, serie_nota ou chave_nfe quando faltarem.',
    ].join(' '),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Leia a imagem e retorne os identificadores da nota e, se houver, a chave do cupom referenciado e os dados do destinatario para localizar a venda na Integrim.',
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
    throw new Error(response.error?.message || 'A leitura da foto nao retornou dados para busca.')
  }

  const parsed = JSON.parse(response.output_text) as NotaLookupModelOutput
  const numeroNota = digitsOnly(parsed.numero_nota)
  const serieNota = normalizeSerie(parsed.serie_nota)
  const chaveNfe = digitsOnly(parsed.chave_nfe).slice(0, 44)
  const chaveReferenciada = digitsOnly(parsed.chave_referenciada).slice(0, 44)
  const documentoCliente = digitsOnly(parsed.documento_cliente)
  const dataEmissao = normalizeDate(parsed.data_emissao)
  const valorTotal = toNumber(parsed.valor_total)
  const parsedKey = parseNfeKey(chaveNfe)
  const finalNumeroNota = numeroNota || parsedKey?.numero_nota || ''
  const finalSerieNota = serieNota || parsedKey?.serie_nota || ''
  const modelMissingFields = parsed.missingFields.filter(isLookupMissingField)

  const requiredMissingFields = [
    !finalNumeroNota ? 'numero_nota' : null,
    !finalSerieNota ? 'serie_nota' : null,
    chaveNfe.length !== 44 ? 'chave_nfe' : null,
  ].filter((field): field is NotaIntegrimLookupHints['missingFields'][number] => Boolean(field))

  return {
    numero_nota: finalNumeroNota,
    serie_nota: finalSerieNota,
    chave_nfe: chaveNfe.length === 44 ? chaveNfe : '',
    chave_referenciada: chaveReferenciada.length === 44 ? chaveReferenciada : '',
    documento_cliente: documentoCliente,
    valor_total: valorTotal ?? null,
    data_emissao: dataEmissao,
    missingFields: Array.from(new Set([...modelMissingFields, ...requiredMissingFields])),
  }
}
