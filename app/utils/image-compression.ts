export const NOTA_IMAGE_MAX_DIMENSION = 1280
export const NOTA_IMAGE_MAX_DATA_URL_LENGTH = 300_000

type NotaImageCompressionOptions = {
  maxDimension?: number
  maxDataUrlLength?: number
  initialQuality?: number
  minQuality?: number
  minDimension?: number
}

const JPEG_MIME_TYPE = 'image/jpeg'

const canUseCanvas = () => {
  return import.meta.client
    && typeof Image !== 'undefined'
    && typeof document !== 'undefined'
}

const canUseImageBitmap = () => {
  return import.meta.client
    && typeof createImageBitmap === 'function'
    && typeof document !== 'undefined'
}

const loadImage = (dataUrl: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nao foi possivel carregar a imagem selecionada.'))
    image.src = dataUrl
  })
}

const getTargetSize = (width: number, height: number, maxDimension: number) => {
  const longestSide = Math.max(width, height)
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

const blobToDataUrl = (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem selecionada.'))
    reader.readAsDataURL(blob)
  })
}

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) => {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(blob => resolve(blob), JPEG_MIME_TYPE, quality)
  })
}

// Comprimento aproximado que o blob teria como data URL base64 (4/3 dos bytes + cabeçalho).
const estimateDataUrlLength = (byteSize: number) => Math.ceil(byteSize / 3) * 4 + 32

const getQualitySteps = (initialQuality: number, minQuality: number) => {
  return [initialQuality, 0.64, 0.56, 0.48, minQuality].filter((quality, index, values) => {
    return quality >= minQuality && values.indexOf(quality) === index
  })
}

const resolveOptions = (options: NotaImageCompressionOptions) => ({
  maxDataUrlLength: options.maxDataUrlLength ?? NOTA_IMAGE_MAX_DATA_URL_LENGTH,
  maxDimension: options.maxDimension ?? NOTA_IMAGE_MAX_DIMENSION,
  minDimension: options.minDimension ?? 900,
  initialQuality: options.initialQuality ?? 0.7,
  minQuality: options.minQuality ?? 0.42,
})

// ---------------------------------------------------------------------------
// Caminho de baixo consumo de memória: decodifica direto para ImageBitmap,
// desenha uma vez por dimensão e exporta com toBlob (sem manter strings base64
// gigantes em memória, o que estourava o WKWebView/Chrome no mobile).
// ---------------------------------------------------------------------------

const renderBitmapAsBlob = async (
  bitmap: ImageBitmap,
  maxDimension: number,
  quality: number,
) => {
  const size = getTargetSize(bitmap.width, bitmap.height, maxDimension)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height

  const context = canvas.getContext('2d')
  if (!context) {
    canvas.width = 0
    canvas.height = 0
    throw new Error('Nao foi possivel preparar a imagem para envio.')
  }

  context.fillStyle = '#fff'
  context.fillRect(0, 0, size.width, size.height)
  context.drawImage(bitmap, 0, 0, size.width, size.height)

  const blob = await canvasToBlob(canvas, quality)
  // Libera a memória do canvas assim que possível.
  canvas.width = 0
  canvas.height = 0
  return blob
}

const normalizeBitmap = async (
  bitmap: ImageBitmap,
  options: NotaImageCompressionOptions,
  originalDataUrl?: string,
) => {
  const { maxDataUrlLength, maxDimension, minDimension, initialQuality, minQuality } = resolveOptions(options)

  const originalMaxSide = Math.max(bitmap.width, bitmap.height)
  if (
    originalDataUrl
    && originalMaxSide <= maxDimension
    && originalDataUrl.length <= maxDataUrlLength
  ) {
    return originalDataUrl
  }

  const qualitySteps = getQualitySteps(initialQuality, minQuality)
  let currentMaxDimension = Math.min(maxDimension, originalMaxSide)
  let bestBlob: Blob | null = null

  while (currentMaxDimension > 0) {
    for (const quality of qualitySteps) {
      const candidate = await renderBitmapAsBlob(bitmap, currentMaxDimension, quality)
      if (!candidate) continue

      if (!bestBlob || candidate.size < bestBlob.size) {
        bestBlob = candidate
      }

      if (estimateDataUrlLength(candidate.size) <= maxDataUrlLength) {
        return await blobToDataUrl(candidate)
      }
    }

    if (currentMaxDimension <= minDimension) break

    const nextDimension = Math.max(minDimension, Math.floor(currentMaxDimension * 0.86))
    if (nextDimension >= currentMaxDimension) break
    currentMaxDimension = nextDimension
  }

  if (bestBlob && estimateDataUrlLength(bestBlob.size) <= maxDataUrlLength) {
    return await blobToDataUrl(bestBlob)
  }

  throw new Error('A imagem ficou muito grande para enviar. Tire uma foto mais proxima do cupom ou recorte a imagem antes de analisar.')
}

/**
 * Normaliza uma imagem a partir de um Blob/File (ex.: input de arquivo da câmera/galeria).
 * Usa createImageBitmap para evitar segurar a data URL em resolução total na memória.
 */
export const normalizeNotaImageFile = async (
  source: Blob,
  options: NotaImageCompressionOptions = {},
) => {
  if (!(source instanceof Blob) || source.size === 0) return ''

  if (canUseImageBitmap()) {
    let bitmap: ImageBitmap | null = null
    try {
      bitmap = await createImageBitmap(source)
      return await normalizeBitmap(bitmap, options)
    }
    catch (error) {
      // Se a decodificação por bitmap falhar, tenta o caminho legado por data URL.
      console.warn('[image-compression] createImageBitmap falhou, usando fallback', error)
    }
    finally {
      bitmap?.close()
    }
  }

  const dataUrl = await blobToDataUrl(source)
  return await normalizeNotaImageDataUrlViaImage(dataUrl, options)
}

/**
 * Normaliza a foto vinda do plugin de câmera nativa quando usamos
 * CameraResultType.Uri: buscamos o arquivo temporário como Blob e reaproveitamos
 * normalizeNotaImageFile. Assim evitamos que o plugin serialize a foto inteira
 * como uma string base64 gigante na bridge JS — que era o que estourava a
 * memória do WebView em aparelhos com pouca RAM.
 */
export const normalizeNotaImageWebPath = async (
  webPath: string,
  options: NotaImageCompressionOptions = {},
) => {
  const trimmed = String(webPath || '').trim()
  if (!trimmed) return ''

  const response = await fetch(trimmed)
  const blob = await response.blob()
  return await normalizeNotaImageFile(blob, options)
}

// ---------------------------------------------------------------------------
// Caminho legado por <img> + canvas.toDataURL, mantido como fallback.
// ---------------------------------------------------------------------------

const renderAsJpegDataUrl = (
  image: HTMLImageElement,
  maxDimension: number,
  quality: number,
) => {
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  const size = getTargetSize(sourceWidth, sourceHeight, maxDimension)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Nao foi possivel preparar a imagem para envio.')
  }

  context.fillStyle = '#fff'
  context.fillRect(0, 0, size.width, size.height)
  context.drawImage(image, 0, 0, size.width, size.height)

  return canvas.toDataURL(JPEG_MIME_TYPE, quality)
}

const normalizeNotaImageDataUrlViaImage = async (
  dataUrl: string,
  options: NotaImageCompressionOptions = {},
) => {
  const trimmed = String(dataUrl || '').trim()
  if (!trimmed.startsWith('data:image/')) return ''
  if (!canUseCanvas()) return trimmed

  const { maxDataUrlLength, maxDimension, minDimension, initialQuality, minQuality } = resolveOptions(options)

  let image: HTMLImageElement
  try {
    image = await loadImage(trimmed)
  }
  catch (error) {
    if (trimmed.length <= maxDataUrlLength) return trimmed
    throw error
  }

  const originalMaxSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height)
  if (originalMaxSide <= maxDimension && trimmed.length <= maxDataUrlLength) {
    return trimmed
  }

  const qualitySteps = getQualitySteps(initialQuality, minQuality)
  let currentMaxDimension = Math.min(maxDimension, originalMaxSide)
  let bestDataUrl = trimmed

  while (currentMaxDimension > 0) {
    for (const quality of qualitySteps) {
      const candidate = renderAsJpegDataUrl(image, currentMaxDimension, quality)

      if (candidate.length < bestDataUrl.length) {
        bestDataUrl = candidate
      }

      if (candidate.length <= maxDataUrlLength) {
        return candidate
      }
    }

    if (currentMaxDimension <= minDimension) break

    const nextDimension = Math.max(minDimension, Math.floor(currentMaxDimension * 0.86))
    if (nextDimension >= currentMaxDimension) break
    currentMaxDimension = nextDimension
  }

  if (bestDataUrl.length <= maxDataUrlLength) {
    return bestDataUrl
  }

  throw new Error('A imagem ficou muito grande para enviar. Tire uma foto mais proxima do cupom ou recorte a imagem antes de analisar.')
}

export const normalizeNotaImageDataUrl = async (
  dataUrl: string,
  options: NotaImageCompressionOptions = {},
) => {
  const trimmed = String(dataUrl || '').trim()
  if (!trimmed.startsWith('data:image/')) return ''

  if (canUseImageBitmap()) {
    let blob: Blob
    try {
      blob = await (await fetch(trimmed)).blob()
    }
    catch {
      return await normalizeNotaImageDataUrlViaImage(trimmed, options)
    }

    let bitmap: ImageBitmap | null = null
    try {
      bitmap = await createImageBitmap(blob)
      return await normalizeBitmap(bitmap, options, trimmed)
    }
    catch (error) {
      console.warn('[image-compression] createImageBitmap falhou, usando fallback', error)
    }
    finally {
      bitmap?.close()
    }
  }

  return await normalizeNotaImageDataUrlViaImage(trimmed, options)
}
