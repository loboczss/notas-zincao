import type { Pinia, PiniaPluginContext } from 'pinia'
import { useToast } from '../composables/useToast'
import { AppRoute } from '../constants/routes'

const isOfflineNotice = (message: string) => {
  return /^(modo offline|sem conexao|voce esta offline|você esta offline|você está offline)/i.test(message.trim())
}

const showMessageToast = (message: string) => {
  const toast = useToast()

  if (isOfflineNotice(message)) {
    toast.warning(message)
    return
  }

  toast.error(message)
}

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = nuxtApp.$pinia as Pinia | undefined
  const route = useRoute()

  pinia?.use(({ store }: PiniaPluginContext) => {
    if (!('errorMessage' in store.$state)) return

    let lastMessage = ''

    store.$subscribe((_mutation, state) => {
      const message = typeof state.errorMessage === 'string'
        ? state.errorMessage.trim()
        : ''

      if (!message) {
        lastMessage = ''
        return
      }

      if (message === lastMessage) return

      lastMessage = message
      const currentPath = window.location.pathname || route.path
      if (
        currentPath === AppRoute.login
        && /^sua sessao expirou ou nao foi reconhecida/i.test(message)
      ) {
        return
      }

      showMessageToast(message)
    }, { detached: true })
  })

  nuxtApp.vueApp.config.errorHandler = (error, _instance, info) => {
    console.error('[vue-error]', info, error)
    useToast().errorFromUnknown(error, 'Erro inesperado no aplicativo.')
  }

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandled-rejection]', event.reason)
    useToast().errorFromUnknown(event.reason, 'Erro inesperado no aplicativo.')
  })

  window.addEventListener('error', (event) => {
    console.error('[window-error]', event.error || event.message)
    useToast().errorFromUnknown(event.error || event.message, 'Erro inesperado no aplicativo.')
  })
})
