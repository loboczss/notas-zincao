import { ref } from 'vue'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
  duration?: number
}

const toasts = ref<ToastMessage[]>([])

export const useToast = () => {
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
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
    addToast({ type: 'error', message, title, duration })
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
    info,
    warning
  }
}
