// Parsers de querystring/body compartilhados pelos endpoints de Integrim Notas.
// Antes cada endpoint reimplementava estes helpers (parsePositiveInteger e afins
// estavam copiados em 5+ arquivos). Centralizados aqui para uma única fonte.

/** Inteiro > 0, ou null. */
export const parsePositiveInteger = (value: unknown): number | null => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) return null
  const integer = Math.trunc(parsed)
  return integer > 0 ? integer : null
}

/** Inteiro >= 0, ou null (vazio vira null). */
export const parseNonNegativeInteger = (value: unknown): number | null => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  const integer = Math.trunc(parsed)
  return integer >= 0 ? integer : null
}

/** Número finito, ou null (vazio vira null). */
export const parseFloatOrNull = (value: unknown): number | null => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/** Booleano tolerante: aceita 0/false/nao/não/no/off como false. */
export const parseBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  return !['0', 'false', 'nao', 'não', 'no', 'off'].includes(normalized)
}

/** Data ISO (YYYY-MM-DD) válida, ou null. */
export const parseDate = (value: unknown): string | null => {
  const raw = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const time = Date.parse(`${raw}T00:00:00Z`)
  return Number.isFinite(time) ? raw : null
}

/** Remove caracteres que quebram filtros LIKE/PostgREST e normaliza espaços. */
export const sanitizeLike = (value: unknown): string =>
  String(value ?? '').replace(/[%,()._{}\\]/g, ' ').replace(/\s+/g, ' ').trim()

/** number | null preservando null/undefined. */
export const numberOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value)
