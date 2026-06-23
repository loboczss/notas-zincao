import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Camada de armazenamento de objetos (imagens das notas/retiradas).
// Provider atual: Backblaze B2 via API S3-compatível.
// Valores gravados no banco recebem o prefixo `b2:` para que a leitura saiba
// assinar via B2; valores antigos (URLs/paths do Supabase) continuam sendo
// assinados pelo Supabase (leitura dupla durante a transição).

export const B2_SCHEME = 'b2:'
const DEFAULT_READ_TTL_SECONDS = 60 * 60

type BackblazeConfig = {
  endpoint: string
  region: string
  bucket: string
  keyId: string
  applicationKey: string
}

const getConfig = (): BackblazeConfig => {
  const cfg = (useRuntimeConfig().backblaze || {}) as Partial<BackblazeConfig>
  return {
    endpoint: String(cfg.endpoint || ''),
    region: String(cfg.region || ''),
    bucket: String(cfg.bucket || ''),
    keyId: String(cfg.keyId || ''),
    applicationKey: String(cfg.applicationKey || ''),
  }
}

export const isBackblazeConfigured = (): boolean => {
  const c = getConfig()
  return Boolean(c.endpoint && c.region && c.bucket && c.keyId && c.applicationKey)
}

let cachedClient: S3Client | null = null

const getClient = (): S3Client => {
  if (cachedClient) return cachedClient
  const c = getConfig()
  const endpoint = /^https?:\/\//i.test(c.endpoint) ? c.endpoint : `https://${c.endpoint}`
  cachedClient = new S3Client({
    region: c.region,
    endpoint,
    credentials: { accessKeyId: c.keyId, secretAccessKey: c.applicationKey },
    // B2 usa path-style nos endpoints S3.
    forcePathStyle: true,
  })
  return cachedClient
}

/** True se o valor gravado aponta para um objeto no Backblaze (prefixo b2:). */
export const isBackblazeValue = (value: unknown): boolean =>
  String(value || '').startsWith(B2_SCHEME)

/** Extrai a chave (key) de um valor `b2:...`. Retorna null se não for B2. */
export const backblazeKeyFromValue = (value: unknown): string | null => {
  const raw = String(value || '')
  if (!raw.startsWith(B2_SCHEME)) return null
  const key = raw.slice(B2_SCHEME.length).replace(/^\/+/, '').trim()
  return key || null
}

/**
 * Sobe um objeto para o B2 e devolve o valor a ser gravado no banco (`b2:{key}`).
 * Lança se o B2 não estiver configurado — o chamador decide o fallback.
 */
export const uploadObjectToBackblaze = async (
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> => {
  const c = getConfig()
  const cleanKey = key.replace(/^\/+/, '')
  await getClient().send(new PutObjectCommand({
    Bucket: c.bucket,
    Key: cleanKey,
    Body: body,
    ContentType: contentType,
  }))
  return `${B2_SCHEME}${cleanKey}`
}

/** Gera uma URL assinada de leitura (GET) para um objeto no B2. */
export const presignBackblazeReadUrl = async (
  key: string,
  expiresIn = DEFAULT_READ_TTL_SECONDS,
): Promise<string> => {
  const c = getConfig()
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: c.bucket, Key: key.replace(/^\/+/, '') }),
    { expiresIn },
  )
}
