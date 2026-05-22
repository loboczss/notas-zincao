const allowedOrigins = new Set([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'https://notas.zincao.cloud',
])

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (!url.pathname.startsWith('/api/')) return

  const origin = getHeader(event, 'origin')
  if (origin && allowedOrigins.has(origin)) {
    setHeader(event, 'Access-Control-Allow-Origin', origin)
    setHeader(event, 'Access-Control-Allow-Credentials', 'true')
    setHeader(event, 'Access-Control-Allow-Headers', 'authorization, content-type, x-requested-with')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    setHeader(event, 'Access-Control-Expose-Headers', 'content-disposition')
    setHeader(event, 'Vary', 'Origin')
  }

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
