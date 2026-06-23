import {
  backblazeKeyFromValue,
  isBackblazeConfigured,
  isBackblazeValue,
  presignBackblazeReadUrl,
  uploadObjectToBackblaze,
} from './object-storage'

export const NOTAS_RETIRADA_STORAGE_BUCKET = 'notas-retirada'

const SIGNED_IMAGE_TTL_SECONDS = 60 * 60

export const getStorageObjectPath = (
  value: unknown,
  bucket = NOTAS_RETIRADA_STORAGE_BUCKET,
) => {
  const raw = String(value || '').trim()

  if (!raw || raw.startsWith('data:')) {
    return null
  }

  const extractFromPath = (input: string) => {
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
      `/storage/v1/render/image/public/${bucket}/`,
      `/storage/v1/render/image/sign/${bucket}/`,
      `/storage/v1/render/image/authenticated/${bucket}/`,
    ]

    for (const marker of markers) {
      const index = input.indexOf(marker)
      if (index >= 0) {
        return input.slice(index + marker.length)
      }
    }

    return null
  }

  let path: string | null = null

  try {
    const url = new URL(raw)
    path = extractFromPath(decodeURIComponent(url.pathname))
  }
  catch {
    path = extractFromPath(decodeURIComponent(raw.split('?')[0] || raw))
  }

  if (!path && !/^https?:\/\//i.test(raw)) {
    path = raw
  }

  if (!path) {
    return null
  }

  const normalized = path
    .split('?')[0]!
    .split('#')[0]!
    .replace(/^\/+/, '')

  return normalized.startsWith(`${bucket}/`)
    ? normalized.slice(bucket.length + 1)
    : normalized
}

export const getNotasRetiradaStoragePath = (value: unknown) => {
  // Valores já no Backblaze são preservados como estão (b2:{key}).
  if (isBackblazeValue(value)) return String(value)
  return getStorageObjectPath(value, NOTAS_RETIRADA_STORAGE_BUCKET)
}

/**
 * Sobe uma imagem de nota/retirada e devolve o valor a gravar no banco.
 * Usa Backblaze quando configurado (retorna `b2:{key}`); senão cai no Supabase
 * Storage (retorna o path cru) para não quebrar ambientes em transição/dev.
 */
export const uploadNotaImageObject = async (
  client: any,
  key: string,
  body: Buffer,
  contentType: string,
  bucket = NOTAS_RETIRADA_STORAGE_BUCKET,
): Promise<string> => {
  if (isBackblazeConfigured()) {
    return uploadObjectToBackblaze(key, body, contentType)
  }

  const { error } = await client.storage
    .from(bucket)
    .upload(key, body, { contentType, upsert: false })

  if (error) throw error
  return key
}

export const createSignedStorageUrl = async (
  client: any,
  value: unknown,
  bucket = NOTAS_RETIRADA_STORAGE_BUCKET,
  expiresIn = SIGNED_IMAGE_TTL_SECONDS,
) => {
  // Objetos novos vivem no Backblaze (valor prefixado com `b2:`).
  if (isBackblazeValue(value)) {
    const key = backblazeKeyFromValue(value)
    if (!key) return value ?? null
    try {
      return await presignBackblazeReadUrl(key, expiresIn)
    }
    catch (error) {
      console.error(`[storage] backblaze signed url error for ${key}:`, error instanceof Error ? error.message : error)
      return value
    }
  }

  // Compatibilidade: objetos antigos no Supabase Storage (URL pública ou path).
  const path = getStorageObjectPath(value, bucket)

  if (!path) {
    return value ?? null
  }

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error(`[storage] signed url error for ${bucket}/${path}:`, error.message)
    return value
  }

  return data?.signedUrl || value
}

export const signNotaStorageUrls = async <T extends Record<string, any>>(
  client: any,
  nota: T,
) => {
  const signed: Record<string, any> = { ...nota }

  signed.foto_url = await createSignedStorageUrl(client, signed.foto_url)
  signed.foto_cliente_url = await createSignedStorageUrl(client, signed.foto_cliente_url)
  signed.comprovante_retirada_url = await createSignedStorageUrl(client, signed.comprovante_retirada_url)

  if (Array.isArray(signed.historico_retiradas)) {
    signed.historico_retiradas = await Promise.all(
      signed.historico_retiradas.map(async (item: any) => ({
        ...item,
        fotos: Array.isArray(item?.fotos)
          ? await Promise.all(item.fotos.map((foto: unknown) => createSignedStorageUrl(client, foto)))
          : [],
      })),
    )
  }

  return signed as T
}

export const signNotasStorageUrls = async <T extends Record<string, any>>(
  client: any,
  notas: T[],
) => {
  return Promise.all(notas.map(nota => signNotaStorageUrls(client, nota)))
}
