import { ref } from 'vue'
import {
  getApiErrorMessage,
  isCacheFallbackNotice,
  isConnectionUnavailableMessage,
} from '../utils/api-errors'
import { AppRoute } from '../constants/routes'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
  duration?: number
}

const toasts = ref<ToastMessage[]>([])
const recentToastKeys = new Map<string, number>()
const TOAST_DEDUPE_MS = 1200
const SERVER_CONNECTION_DEDUPE_MS = 60_000
let offlineConnectionNoticeShown = false
let lastServerConnectionNoticeAt = 0
let resetListenerBound = false

const isBrowserOffline = () => {
  return import.meta.client && typeof navigator !== 'undefined' && !navigator.onLine
}

const ensureConnectionNoticeReset = () => {
  if (!import.meta.client || resetListenerBound) return

  window.addEventListener('online', () => {
    offlineConnectionNoticeShown = false
    lastServerConnectionNoticeAt = 0
  })
  resetListenerBound = true
}

const isPassiveLoginSessionNotice = (message: string) => {
  if (!import.meta.client) return false

  return window.location.pathname === AppRoute.login
    && /^sua sessao expirou ou nao foi reconhecida/i.test(message.trim())
}

export const useToast = () => {
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const message = toast.message.trim()
    if (isCacheFallbackNotice(message)) return

    if (isConnectionUnavailableMessage(message)) {
      ensureConnectionNoticeReset()

      if (isBrowserOffline()) {
        if (offlineConnectionNoticeShown) return
        offlineConnectionNoticeShown = true
      }
      else {
        const now = Date.now()
        if (now - lastServerConnectionNoticeAt < SERVER_CONNECTION_DEDUPE_MS) return
        lastServerConnectionNoticeAt = now
      }
    }

    const key = `${toast.type}:${toast.title || ''}:${toast.message}`
    const now = Date.now()
    const lastShownAt = recentToastKeys.get(key) || 0

    if (now - lastShownAt < TOAST_DEDUPE_MS) {
      return
    }

    recentToastKeys.set(key, now)

    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const newToast: ToastMessage = {
      id,
      duration: 5000, // default duration
      ...toast
    }
    
    toasts.value.push(newToast)
    
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    setTimeout(() => {
      recentToastKeys.delete(key)
    }, TOAST_DEDUPE_MS)
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  const success = (message: string, title?: string, duration = 5000) => {
    addToast({ type: 'success', message, title, duration })
  }

  const error = (message: string, title?: string, duration = 5000) => {
    if (isPassiveLoginSessionNotice(message)) return
    addToast({ type: 'error', message, title, duration })
  }

  const errorFromUnknown = (errorValue: unknown, fallback?: string, title = 'Erro', duration = 7000) => {
    error(getApiErrorMessage(errorValue, fallback), title, duration)
  }

  const info = (message: string, title?: string, duration = 5000) => {
    addToast({ type: 'info', message, title, duration })
  }

  const warning = (message: string, title?: string, duration = 5000) => {
    addToast({ type: 'warning', message, title, duration })
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    errorFromUnknown,
    info,
    warning
  }
}
