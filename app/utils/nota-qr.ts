import type { NfeKeyParts } from '~~/shared/utils/nfe-chave'
import { parseNfeKey } from '~~/shared/utils/nfe-chave'

type BarcodeDetection = {
  rawValue?: string
}

type BarcodeDetectorLike = {
  detect(source: HTMLImageElement): Promise<BarcodeDetection[]>
}

type BarcodeDetectorConstructor = {
  new(options?: { formats?: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

const loadImage = (dataUrl: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nao foi possivel carregar a imagem para ler o QR Code.'))
    image.src = dataUrl
  })
}

export const readNfeKeyFromQrImage = async (dataUrl: string): Promise<NfeKeyParts | null> => {
  if (!import.meta.client || !dataUrl.startsWith('data:image/')) return null

  const detectorConstructor = (globalThis as typeof globalThis & {
    BarcodeDetector?: BarcodeDetectorConstructor
  }).BarcodeDetector

  if (!detectorConstructor) return null

  try {
    const formats = typeof detectorConstructor.getSupportedFormats === 'function'
      ? await detectorConstructor.getSupportedFormats()
      : ['qr_code']

    if (Array.isArray(formats) && formats.length && !formats.includes('qr_code')) {
      return null
    }

    const image = await loadImage(dataUrl)
    const detector = new detectorConstructor({ formats: ['qr_code'] })
    const detections = await detector.detect(image)

    for (const detection of detections) {
      const parsed = parseNfeKey(detection.rawValue || '')
      if (parsed) return parsed
    }
  }
  catch (error) {
    console.warn('[nota-qr] QR detection failed:', error instanceof Error ? error.message : 'unknown error')
  }

  return null
}
