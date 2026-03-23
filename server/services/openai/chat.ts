import type { OpenAIChatRequest, OpenAIChatResponse } from '../../../shared/types/OpenAI'
import { DEFAULT_OPENAI_MODEL, isOpenAIModelSupported } from '../../../shared/constants/OpenAIModels'
import { getOpenAIClient } from './client'

export async function createOpenAIChat(
  event: Parameters<typeof useRuntimeConfig>[0],
  payload: OpenAIChatRequest,
): Promise<OpenAIChatResponse> {
  const client = getOpenAIClient(event)

  const model = payload.model && isOpenAIModelSupported(payload.model)
    ? payload.model
    : DEFAULT_OPENAI_MODEL

  const userMessageContent = payload.imageDataUrl
    ? [
        ...(payload.message
          ? [{ type: 'text' as const, text: payload.message }]
          : []),
        {
          type: 'image_url' as const,
          image_url: { url: payload.imageDataUrl },
        },
      ]
    : payload.message

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content: payload.systemPrompt || 'Você é um assistente útil e objetivo.',
      },
      {
        role: 'user',
        content: userMessageContent,
      },
    ],
  })

  return {
    text: completion.choices[0]?.message?.content || '',
    model: completion.model,
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
  }
}
