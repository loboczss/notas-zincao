export const getApiErrorStatus = (error: unknown) => {
  const candidate = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } }
  const status = candidate?.statusCode ?? candidate?.status ?? candidate?.response?.status
  const parsed = Number(status)
  return Number.isFinite(parsed) ? parsed : null
}

const getErrorText = (error: unknown) => {
  const candidate = error as {
    data?: { message?: unknown; statusMessage?: unknown }
    response?: { _data?: { message?: unknown; statusMessage?: unknown } }
    statusMessage?: unknown
  }
  const serverMessage = candidate?.data?.statusMessage
    ?? candidate?.data?.message
    ?? candidate?.response?._data?.statusMessage
    ?? candidate?.response?._data?.message
    ?? candidate?.statusMessage

  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    return serverMessage
  }

  if (error instanceof Error) return error.message
  return String(error || '')
}

export const normalizeMessageText = (value: string) => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export const isNetworkFetchError = (error: unknown) => {
  const message = getErrorText(error)
  return /failed to fetch|fetch failed|networkerror|network request failed|load failed|<no response>|err_name_not_resolved|err_internet_disconnected|timeout/i.test(message)
}

export const isUnauthorizedError = (error: unknown) => getApiErrorStatus(error) === 401

export const isCacheFallbackNotice = (message: string) => {
  return normalizeMessageText(message).startsWith('modo offline')
}

export const isConnectionUnavailableMessage = (message: string) => {
  return /^(sem conexao com o servidor|voce esta offline|voce esta sem internet|sem internet)/.test(normalizeMessageText(message))
}

export const getApiErrorMessage = (error: unknown, fallback = 'Falha ao comunicar com o servidor.') => {
  const status = getApiErrorStatus(error)

  if (status === 401) {
    return 'Sua sessao expirou ou nao foi reconhecida. Entre novamente e tente de novo.'
  }

  if (status === 403) {
    return 'Voce nao tem permissao para executar esta acao.'
  }

  if (status === 413) {
    return 'Imagem muito grande para enviar. Tire uma foto mais proxima do documento ou recorte a imagem e tente novamente.'
  }

  if (isNetworkFetchError(error)) {
    return 'Sem conexao com o servidor. Verifique a internet e tente novamente.'
  }

  const message = getErrorText(error).trim()
  return message || fallback
}
