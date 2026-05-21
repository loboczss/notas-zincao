export default defineNuxtPlugin(() => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/offline-sw.js').catch((error) => {
      console.warn('[offline-worker] registration failed', error)
    })
  })
})
