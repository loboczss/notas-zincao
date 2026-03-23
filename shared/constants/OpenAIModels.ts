export const AVAILABLE_OPENAI_MODELS = [
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    description: 'Modelo principal para tarefas complexas, raciocínio e código.',
  },
  {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    description: 'Versão mais rápida e econômica para uso geral.',
  },
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 Nano',
    description: 'Versão mais barata para alto volume e tarefas simples.',
  },
] as const

export type OpenAIModelId = (typeof AVAILABLE_OPENAI_MODELS)[number]['id']

export const DEFAULT_OPENAI_MODEL: OpenAIModelId = 'gpt-5.4-mini'

export function isOpenAIModelSupported(model: string): model is OpenAIModelId {
  return AVAILABLE_OPENAI_MODELS.some(item => item.id === model)
}
