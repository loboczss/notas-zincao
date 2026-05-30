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
    'missingFields',
  ],
  properties: {
    numero_nota: { type: 'string' },
    serie_nota: { type: 'string' },
    chave_nfe: { type: 'string' },
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
  missingFields: string[]
}

const digitsOnly = (value: unknown) => String(value || '').replace(/\D/g, '')

const normalizeSerie = (value: unknown) => {
  return String(value || '')
    .trim()
    .replace(/[^\w-]/g, '')
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
      'Extraia somente tres campos: numero da nota, serie da nota e chave NFe/NFC-e de 44 digitos.',
      'Nao extraia cliente, produtos, telefone, valores ou data. Esses dados serao buscados em outro sistema.',
      'Retorne apenas o que estiver visualmente legivel. Nao invente numero, serie ou chave.',
      'numero_nota e chave_nfe devem conter somente digitos. serie_nota deve preservar letras/numeros/hifen quando estiver legivel.',
      'Se um campo estiver ausente, borrado, cortado ou ambiguo, retorne string vazia e inclua em missingFields.',
    ].join(' '),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Leia a imagem e retorne somente numero_nota, serie_nota e chave_nfe para localizar a nota na Integrim.',
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
    missingFields: Array.from(new Set([...modelMissingFields, ...requiredMissingFields])),
  }
}
