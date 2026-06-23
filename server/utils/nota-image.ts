import { randomUUID } from 'node:crypto'

// Helpers compartilhados para imagens de nota/retirada (parsing de data URL,
// extensão por mime e geração de chave). Centralizados para não duplicar entre
// os endpoints (create, retirada) e o uploader em segundo plano.

export type ParsedImageDataUrl = { mimeType: string, base64Content: string }

export const parseImageDataUrl = (value: unknown): ParsedImageDataUrl | null => {
  const match = String(value || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const mimeType = match[1] || ''
  const base64Content = match[2] || ''
  if (!mimeType || !base64Content) return null
  return { mimeType, base64Content }
}

export const getExtensionFromMime = (mimeType: string): string => {
  switch (mimeType) {
    case 'image/jpeg': return 'jpg'
    case 'image/png': return 'png'
    case 'image/webp': return 'webp'
    case 'image/heic': return 'heic'
    default: return 'bin'
  }
}

export const isImageDataUrl = (value: unknown): boolean =>
  String(value || '').trim().startsWith('data:image/')

/** Chave de objeto: `{ownerUserId}/{kind}/{timestamp}-{uuid}.{ext}`. */
export const buildNotaImageKey = (ownerUserId: string, kind: string, mimeType: string): string =>
  `${ownerUserId}/${kind}/${Date.now()}-${randomUUID()}.${getExtensionFromMime(mimeType)}`
