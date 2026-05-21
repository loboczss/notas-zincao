import type { NotaRetiradaRow } from '../../../app/types/database.types'
import type {
  OfflineNotaAsset,
  OfflineNotaAssetKind,
  OfflineNotaSyncItem,
} from '../../../shared/types/OfflineNotasSync'
import { NOTAS_RETIRADA_STORAGE_BUCKET, getNotasRetiradaStoragePath } from '../../utils/storage'

export const OFFLINE_NOTAS_SYNC_DEFAULT_PAGE_SIZE = 50
export const OFFLINE_NOTAS_SYNC_MAX_PAGE_SIZE = 100
export const OFFLINE_NOTAS_SYNC_SIGNED_URL_TTL_SECONDS = 60 * 60

export const OFFLINE_NOTAS_SYNC_SELECT = [
  'id',
  'owner_user_id',
  'contato_id',
  'foto_url',
  'foto_cliente_url',
  'nome_cliente',
  'documento_cliente',
  'telefone_cliente',
  'numero_nota',
  'serie_nota',
  'chave_nfe',
  'data_compra',
  'data_prevista_retirada',
  'produtos',
  'valor_total',
  'desconto_total',
  'observacoes',
  'status_retirada',
  'data_retirada',
  'retirada_confirmada_por',
  'comprovante_retirada_url',
  'criado_em',
  'atualizado_em',
  'historico_retiradas',
  'deleted_at',
  'deleted_by',
].join(', ')

type NotaAssetCandidate = {
  kind: OfflineNotaAssetKind
  field: string
  value: unknown
}

export type SignedUrlResult = {
  signedUrlByPath: Map<string, string>
  expiresAt: string | null
}

export const normalizeSyncPage = (value: unknown) => {
  const parsed = Number(String(value || '1').trim())
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1
}

export const normalizeSyncPageSize = (value: unknown) => {
  const parsed = Number(String(value || OFFLINE_NOTAS_SYNC_DEFAULT_PAGE_SIZE).trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return OFFLINE_NOTAS_SYNC_DEFAULT_PAGE_SIZE

  return Math.min(OFFLINE_NOTAS_SYNC_MAX_PAGE_SIZE, Math.trunc(parsed))
}

export const normalizeSyncSince = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) return null

  const timestamp = Date.parse(raw)
  if (!Number.isFinite(timestamp)) return null

  return new Date(timestamp).toISOString()
}

export const normalizeSyncBoolean = (value: unknown) => {
  const raw = String(value || '').trim().toLowerCase()
  return ['1', 'true', 'sim', 'yes'].includes(raw)
}

const getNotaAssetCandidates = (nota: Partial<NotaRetiradaRow>): NotaAssetCandidate[] => {
  const candidates: NotaAssetCandidate[] = [
    { kind: 'cupom', field: 'foto_url', value: nota.foto_url },
    { kind: 'cliente', field: 'foto_cliente_url', value: nota.foto_cliente_url },
    { kind: 'comprovante_retirada', field: 'comprovante_retirada_url', value: nota.comprovante_retirada_url },
  ]

  const historico = Array.isArray(nota.historico_retiradas)
    ? nota.historico_retiradas
    : []

  historico.forEach((item, historicoIndex) => {
    const fotos = Array.isArray(item?.fotos) ? item.fotos : []

    fotos.forEach((foto, fotoIndex) => {
      candidates.push({
        kind: 'historico_retirada',
        field: `historico_retiradas.${historicoIndex}.fotos.${fotoIndex}`,
        value: foto,
      })
    })
  })

  return candidates
}

export const collectNotaOfflineAssets = (
  nota: Partial<NotaRetiradaRow> & { id: string },
): OfflineNotaAsset[] => {
  const seenFields = new Set<string>()
  const assets: OfflineNotaAsset[] = []

  for (const candidate of getNotaAssetCandidates(nota)) {
    const path = getNotasRetiradaStoragePath(candidate.value)
    const fieldKey = `${candidate.field}:${path}`
    if (!path || seenFields.has(fieldKey)) continue

    seenFields.add(fieldKey)
    assets.push({
      id: `${nota.id}:${candidate.field}`,
      nota_id: nota.id,
      kind: candidate.kind,
      field: candidate.field,
      bucket: NOTAS_RETIRADA_STORAGE_BUCKET,
      path,
      source_value: String(candidate.value || ''),
      download_url: null,
      expires_at: null,
    })
  }

  return assets
}

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

export const createSignedUrlMap = async (
  client: any,
  paths: string[],
  expiresIn = OFFLINE_NOTAS_SYNC_SIGNED_URL_TTL_SECONDS,
): Promise<SignedUrlResult> => {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  const signedUrlByPath = new Map<string, string>()
  const expiresAt = uniquePaths.length
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null

  for (const pathChunk of chunk(uniquePaths, 100)) {
    const storage = client.storage.from(NOTAS_RETIRADA_STORAGE_BUCKET)

    if (typeof storage.createSignedUrls === 'function') {
      const { data, error } = await storage.createSignedUrls(pathChunk, expiresIn)

      if (!error && Array.isArray(data)) {
        data.forEach((item: any) => {
          const path = String(item?.path || '').trim()
          const signedUrl = String(item?.signedUrl || '').trim()
          if (path && signedUrl) signedUrlByPath.set(path, signedUrl)
        })
      }

      if (error) {
        console.error('[sync/notas] batch signed urls error:', error.message)
      }
    }

    const missingPaths = pathChunk.filter(path => !signedUrlByPath.has(path))

    await Promise.all(missingPaths.map(async (path) => {
      const { data, error } = await storage.createSignedUrl(path, expiresIn)
      if (error) {
        console.error(`[sync/notas] signed url error for ${path}:`, error.message)
        return
      }

      const signedUrl = String(data?.signedUrl || '').trim()
      if (signedUrl) signedUrlByPath.set(path, signedUrl)
    }))
  }

  return { signedUrlByPath, expiresAt }
}

export const attachSignedUrlsToAssets = (
  assets: OfflineNotaAsset[],
  signed: SignedUrlResult,
) => assets.map(asset => ({
  ...asset,
  download_url: signed.signedUrlByPath.get(asset.path) || null,
  expires_at: signed.signedUrlByPath.has(asset.path) ? signed.expiresAt : null,
}))

export const buildOfflineNotaSyncItem = (
  nota: NotaRetiradaRow & { cadastrado_por_nome?: string | null },
  signed: SignedUrlResult,
): OfflineNotaSyncItem => {
  const assets = attachSignedUrlsToAssets(collectNotaOfflineAssets(nota), signed)
  const updatedAt = nota.atualizado_em || nota.criado_em

  return {
    id: nota.id,
    updated_at: updatedAt,
    deleted_at: nota.deleted_at,
    sync_key: `${updatedAt}:${nota.id}`,
    data: {
      id: nota.id,
      owner_user_id: nota.owner_user_id,
      contato_id: nota.contato_id,
      foto_url: nota.foto_url,
      foto_cliente_url: nota.foto_cliente_url,
      nome_cliente: nota.nome_cliente,
      documento_cliente: nota.documento_cliente,
      telefone_cliente: nota.telefone_cliente,
      numero_nota: nota.numero_nota,
      serie_nota: nota.serie_nota,
      chave_nfe: nota.chave_nfe,
      data_compra: nota.data_compra,
      data_prevista_retirada: nota.data_prevista_retirada,
      produtos: Array.isArray(nota.produtos) ? nota.produtos : [],
      valor_total: nota.valor_total,
      desconto_total: nota.desconto_total,
      observacoes: nota.observacoes,
      status_retirada: nota.status_retirada,
      data_retirada: nota.data_retirada,
      retirada_confirmada_por: nota.retirada_confirmada_por,
      comprovante_retirada_url: nota.comprovante_retirada_url,
      criado_em: nota.criado_em,
      atualizado_em: nota.atualizado_em,
      historico_retiradas: Array.isArray(nota.historico_retiradas) ? nota.historico_retiradas : null,
      deleted_at: nota.deleted_at,
      deleted_by: nota.deleted_by,
      cadastrado_por_nome: nota.cadastrado_por_nome || null,
    },
    assets,
    asset_count: assets.length,
  }
}

export const attachCreatorNamesForSync = async (
  client: any,
  notas: NotaRetiradaRow[],
) => {
  const ownerIds = [...new Set(
    notas
      .map(nota => String(nota.owner_user_id || '').trim())
      .filter(Boolean),
  )]

  if (!ownerIds.length) {
    return notas.map(nota => ({
      ...nota,
      cadastrado_por_nome: null,
    }))
  }

  const { data, error } = await client
    .from('profiles')
    .select('auth_uid, nome, email')
    .in('auth_uid', ownerIds)

  if (error) {
    console.error('[sync/notas] profiles error:', error.message)
  }

  const creatorsByAuthUid = new Map<string, string>()
  for (const profile of (data || []) as Array<{ auth_uid: string; nome?: string | null; email?: string | null }>) {
    const label = String(profile.nome || profile.email || '').trim()
    if (profile.auth_uid && label) {
      creatorsByAuthUid.set(String(profile.auth_uid), label)
    }
  }

  return notas.map(nota => ({
    ...nota,
    cadastrado_por_nome: creatorsByAuthUid.get(String(nota.owner_user_id || '')) || null,
  }))
}
