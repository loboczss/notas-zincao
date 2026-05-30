export const NOTA_IMAGE_MAX_DIMENSION = 1800
export const NOTA_IMAGE_MAX_DATA_URL_LENGTH = 950_000

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

export const normalizeNotaImageDataUrl = async (
  dataUrl: string,
  options: NotaImageCompressionOptions = {},
) => {
  const trimmed = String(dataUrl || '').trim()
  if (!trimmed.startsWith('data:image/')) return ''
  if (!canUseCanvas()) return trimmed

  const maxDataUrlLength = options.maxDataUrlLength ?? NOTA_IMAGE_MAX_DATA_URL_LENGTH
  const maxDimension = options.maxDimension ?? NOTA_IMAGE_MAX_DIMENSION
  const minDimension = options.minDimension ?? 1000
  const initialQuality = options.initialQuality ?? 0.72
  const minQuality = options.minQuality ?? 0.5

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

  const qualitySteps = [
    initialQuality,
    0.64,
    0.56,
    minQuality,
  ].filter((quality, index, values) => {
    return quality >= minQuality && values.indexOf(quality) === index
  })

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
