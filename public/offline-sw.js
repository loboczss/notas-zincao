const CACHE_NAME = 'notas-zincao-shell-v1'
const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/logomarca.png',
  '/logomarca.svg',
  '/logomarca.ico',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

const isApiRequest = request => new URL(request.url).pathname.startsWith('/api/')

const cacheResponse = async (request, response) => {
  if (!response || response.status !== 200 || response.type === 'opaque') return response

  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response.clone())
  return response
}

const networkFirst = async (request) => {
  try {
    return await cacheResponse(request, await fetch(request))
  }
  catch {
    return await caches.match(request) || await caches.match('/') || Response.error()
  }
}

const staleWhileRevalidate = async (request) => {
  const cached = await caches.match(request)
  const refresh = fetch(request)
    .then(response => cacheResponse(request, response))
    .catch(() => null)

  return cached || await refresh || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin || isApiRequest(request)) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})
