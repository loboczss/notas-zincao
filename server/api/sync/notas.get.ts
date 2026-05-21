import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database, NotaRetiradaRow } from '../../../app/types/database.types'
import type { OfflineNotasSyncResponse } from '../../../shared/types/OfflineNotasSync'
import {
  OFFLINE_NOTAS_SYNC_SELECT,
  attachCreatorNamesForSync,
  buildOfflineNotaSyncItem,
  collectNotaOfflineAssets,
  createSignedUrlMap,
  normalizeSyncBoolean,
  normalizeSyncPage,
  normalizeSyncPageSize,
  normalizeSyncSince,
} from '../../services/sync/notas-offline'
import { NOTE_OPERATOR_ROLES, assertActiveProfileRole, getAuthUidOrThrow } from '../../utils/permissions'

export const syncNotasGetHandler = defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const authUid = getAuthUidOrThrow(user)
  const client = await serverSupabaseClient<Database>(event)
  const role = await assertActiveProfileRole(
    client as any,
    authUid,
    [...NOTE_OPERATOR_ROLES],
    'Usuario sem permissao ativa para sincronizar notas.',
  )
  const canSyncAllNotes = role === 'admin' || role === 'colaborador'
  const syncScope = canSyncAllNotes ? 'all' : 'own'

  const query = getQuery(event)
  const page = normalizeSyncPage(query.page)
  const pageSize = normalizeSyncPageSize(query.page_size)
  const since = normalizeSyncSince(query.since)
  const includeDeleted = normalizeSyncBoolean(query.include_deleted)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let request = (client as any)
    .from('notas_retirada')
    .select(OFFLINE_NOTAS_SYNC_SELECT, { count: 'exact' })
    .order('atualizado_em', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to)

  if (!includeDeleted) {
    request = request.is('deleted_at', null)
  }

  if (!canSyncAllNotes) {
    request = request.eq('owner_user_id', authUid)
  }

  if (since) {
    request = request.gte('atualizado_em', since)
  }

  const { data, error, count } = await request

  if (error) {
    console.error('[api/sync/notas] list error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel preparar as notas para sincronizacao.',
    })
  }

  let uploadCountRequest = (client as any)
    .from('notas_retirada')
    .select('id', { count: 'exact', head: true })
    .eq('owner_user_id', authUid)

  if (!includeDeleted) {
    uploadCountRequest = uploadCountRequest.is('deleted_at', null)
  }

  const { count: totalCloudNotesCreatedByUser, error: uploadCountError } = await uploadCountRequest

  if (uploadCountError) {
    console.error('[api/sync/notas] upload count error:', uploadCountError.message)
  }

  const notas = (data || []) as NotaRetiradaRow[]
  const notasComCriadores = await attachCreatorNamesForSync(client as any, notas)
  const assetPaths = notas
    .flatMap(nota => collectNotaOfflineAssets(nota).map(asset => asset.path))
  const signed = await createSignedUrlMap(client as any, assetPaths)
  const syncItems = notasComCriadores.map(nota => buildOfflineNotaSyncItem(nota, signed))

  const total = Number(count || 0)
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0
  const completedBeforePage = Math.min(from, total)
  const returnedNotes = syncItems.length
  const returnedAssets = syncItems.reduce((sum, item) => sum + item.asset_count, 0)
  const signedAssets = syncItems.reduce(
    (sum, item) => sum + item.assets.filter(asset => asset.download_url).length,
    0,
  )
  const remainingAfterPage = Math.max(0, total - completedBeforePage - returnedNotes)

  const response: OfflineNotasSyncResponse = {
    success: true,
    generated_at: new Date().toISOString(),
    permissions: {
      role,
      scope: syncScope,
    },
    include_deleted: includeDeleted,
    since,
    signed_url_expires_at: signed.expiresAt,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
      has_more: remainingAfterPage > 0,
      next_page: remainingAfterPage > 0 ? page + 1 : null,
    },
    progress: {
      download: {
        total_cloud_notes: total,
        completed_before_page: completedBeforePage,
        returned_notes: returnedNotes,
        remaining_after_page: remainingAfterPage,
        returned_assets: returnedAssets,
        signed_assets: signedAssets,
      },
      upload: {
        total_cloud_notes_created_by_user: Number(totalCloudNotesCreatedByUser || 0),
      },
    },
    notas: syncItems,
  }

  return response
})

export default syncNotasGetHandler
