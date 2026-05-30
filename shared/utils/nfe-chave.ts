export type NfeKeyParts = {
  chave_nfe: string
  modelo: string
  serie_nota: string
  numero_nota: string
}

const digitsOnly = (value: unknown) => String(value || '').replace(/\D/g, '')

export const extractNfeKeyFromText = (value: unknown) => {
  const digits = digitsOnly(value)
  const match = digits.match(/\d{44}/)
  return match?.[0] || ''
}

export const parseNfeKey = (value: unknown): NfeKeyParts | null => {
  const chave = extractNfeKeyFromText(value)
  if (chave.length !== 44) return null

  return {
    chave_nfe: chave,
    modelo: chave.slice(20, 22),
    serie_nota: String(Number(chave.slice(22, 25)) || '').trim(),
    numero_nota: String(Number(chave.slice(25, 34)) || '').trim(),
  }
}
