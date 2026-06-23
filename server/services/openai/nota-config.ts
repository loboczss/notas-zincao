type ImageDetail = 'low' | 'auto' | 'high'
type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh'

const DEFAULT_NOTA_MODEL = 'gpt-5.4-mini'
const DEFAULT_IMAGE_DETAIL: ImageDetail = 'high'
const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'low'

const getEnv = (name: string) => String(process.env[name] || '').trim()

const parseImageDetail = (value: string): ImageDetail => {
  return value === 'low' || value === 'auto' || value === 'high'
    ? value
    : DEFAULT_IMAGE_DETAIL
}

const parseReasoningEffort = (value: string): ReasoningEffort => {
  return value === 'none' || value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh'
    ? value
    : DEFAULT_REASONING_EFFORT
}

export const getNotaLookupOpenAIConfig = () => ({
  model: getEnv('OPENAI_NOTA_LOOKUP_MODEL') || getEnv('OPENAI_NOTA_MODEL') || DEFAULT_NOTA_MODEL,
  imageDetail: parseImageDetail(getEnv('OPENAI_NOTA_LOOKUP_IMAGE_DETAIL') || getEnv('OPENAI_NOTA_IMAGE_DETAIL')),
  reasoningEffort: parseReasoningEffort(getEnv('OPENAI_NOTA_LOOKUP_REASONING_EFFORT') || getEnv('OPENAI_NOTA_REASONING_EFFORT')),
})

export const getNotaExtractionOpenAIConfig = () => ({
  model: getEnv('OPENAI_NOTA_EXTRACTION_MODEL') || getEnv('OPENAI_NOTA_MODEL') || DEFAULT_NOTA_MODEL,
  imageDetail: parseImageDetail(getEnv('OPENAI_NOTA_EXTRACTION_IMAGE_DETAIL') || getEnv('OPENAI_NOTA_IMAGE_DETAIL')),
  reasoningEffort: parseReasoningEffort(getEnv('OPENAI_NOTA_EXTRACTION_REASONING_EFFORT') || getEnv('OPENAI_NOTA_REASONING_EFFORT')),
})

export const getNotaProductsOpenAIConfig = () => ({
  model: getEnv('OPENAI_NOTA_PRODUCTS_MODEL') || getEnv('OPENAI_NOTA_MODEL') || DEFAULT_NOTA_MODEL,
  imageDetail: parseImageDetail(getEnv('OPENAI_NOTA_PRODUCTS_IMAGE_DETAIL') || getEnv('OPENAI_NOTA_IMAGE_DETAIL')),
  reasoningEffort: parseReasoningEffort(getEnv('OPENAI_NOTA_PRODUCTS_REASONING_EFFORT') || getEnv('OPENAI_NOTA_REASONING_EFFORT')),
})
