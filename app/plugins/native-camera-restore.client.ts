import { AppRoute } from '../constants/routes'
import {
  CADASTRO_NOTA_CAMERA_PENDING_KEY,
  CADASTRO_NOTA_RESTORED_IMAGE_STATE_KEY,
  RETIRADA_FOTO_CAMERA_PENDING_KEY,
  retiradaFotoRestoredImageStateKey,
} from '../constants/camera-capture'

type RestoredCameraPhoto = {
  dataUrl?: string
  base64String?: string
  format?: string
}

type RestoredCameraEvent = {
  pluginId?: string
  methodName?: string
  success?: boolean
  data?: RestoredCameraPhoto
}

type PendingRetiradaCamera = {
  notaId?: string
  route?: string
}

const dataUrlFromRestoredPhoto = (photo?: RestoredCameraPhoto) => {
  if (!photo) return ''
  if (photo.dataUrl) return photo.dataUrl
  if (photo.base64String) {
    const format = photo.format || 'jpeg'
    return `data:image/${format};base64,${photo.base64String}`
  }

  return ''
}

export default defineNuxtPlugin(async () => {
  const { Capacitor } = await import('@capacitor/core')
  if (!Capacitor.isNativePlatform()) return

  const { App } = await import('@capacitor/app')
  const router = useRouter()
  const restoredImageDataUrl = useState<string>(CADASTRO_NOTA_RESTORED_IMAGE_STATE_KEY, () => '')

  const parsePendingRetirada = () => {
    const raw = localStorage.getItem(RETIRADA_FOTO_CAMERA_PENDING_KEY)
    if (!raw) return null

    try {
      return JSON.parse(raw) as PendingRetiradaCamera
    }
    catch {
      return null
    }
  }

  await App.addListener('appRestoredResult', async (event: RestoredCameraEvent) => {
    if (event.pluginId !== 'Camera' || event.methodName !== 'getPhoto') return

    const pendingSource = localStorage.getItem(CADASTRO_NOTA_CAMERA_PENDING_KEY)
    const pendingRetirada = parsePendingRetirada()
    if (!pendingSource && !pendingRetirada?.notaId) return

    localStorage.removeItem(CADASTRO_NOTA_CAMERA_PENDING_KEY)
    localStorage.removeItem(RETIRADA_FOTO_CAMERA_PENDING_KEY)
    if (!event.success) return

    const dataUrl = dataUrlFromRestoredPhoto(event.data)
    if (!dataUrl) return

    if (pendingRetirada?.notaId) {
      const restoredRetiradaImageDataUrl = useState<string>(retiradaFotoRestoredImageStateKey(pendingRetirada.notaId), () => '')
      restoredRetiradaImageDataUrl.value = dataUrl

      if (pendingRetirada.route && router.currentRoute.value.fullPath !== pendingRetirada.route) {
        await router.replace(pendingRetirada.route)
      }

      return
    }

    restoredImageDataUrl.value = dataUrl
    if (router.currentRoute.value.path !== AppRoute.cadastrarNota) {
      await router.replace(AppRoute.cadastrarNota)
    }
  })
})
