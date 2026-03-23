export const healthGetHandler = defineEventHandler(() => {
  return {
    status: 'ok',
    service: 'notas-zincao-api',
    timestamp: new Date().toISOString(),
  }
})

export default healthGetHandler
