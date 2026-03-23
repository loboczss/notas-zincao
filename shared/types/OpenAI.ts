import type { OpenAIModelId } from '../constants/OpenAIModels'
import type { NotaExtractionRequest, NotaExtractionResponse } from './NotasRetirada'

export type OpenAIChatRequest = {
  message: string
  model?: OpenAIModelId
  systemPrompt?: string
  imageDataUrl?: string
}

export type OpenAIChatResponse = {
  text: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export type OpenAINotaExtractionRequest = NotaExtractionRequest
export type OpenAINotaExtractionResponse = NotaExtractionResponse
