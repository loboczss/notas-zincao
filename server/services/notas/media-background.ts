import { createAdminClient } from '../stock-integrin/sync/repository'
import { uploadNotaImageObject } from '../../utils/storage'
import { buildNotaImageKey, parseImageDataUrl } from '../../utils/nota-image'
import type { NotaRetiradaHistoricoItem } from '../../../shared/types/NotasRetirada'

// Upload das imagens em segundo plano: a requisição HTTP responde assim que a
// nota/retirada é gravada e o upload pesado (data URL -> Backblaze) acontece
// aqui, atualizando a linha e o midia_status quando termina. Roda no processo
// do servidor (fire-and-forget), como o sync do Integrim.

const NOTAS_TABLE = 'notas_retirada'

const uploadDataUrl = async (
  client: any,
  ownerUserId: string,
  kind: string,
  dataUrl: string,
): Promise<string | null> => {
  const parsed = parseImageDataUrl(dataUrl)
  if (!parsed) return null
  const key = buildNotaImageKey(ownerUserId, kind, parsed.mimeType)
  const buffer = Buffer.from(parsed.base64Content, 'base64')
  return uploadNotaImageObject(client, key, buffer, parsed.mimeType)
}

type CreateMediaInput = {
  notaId: string
  ownerUserId: string
  cupomDataUrl: string
  clienteDataUrl: string | null
}

const runCreateNotaMedia = async (input: CreateMediaInput) => {
  const admin = createAdminClient()
  try {
    const fotoUrl = await uploadDataUrl(admin, input.ownerUserId, 'cupom', input.cupomDataUrl)
    const fotoClienteUrl = input.clienteDataUrl
      ? await uploadDataUrl(admin, input.ownerUserId, 'cliente', input.clienteDataUrl)
      : null

    await (admin as any)
      .from(NOTAS_TABLE)
      .update({
        foto_url: fotoUrl,
        foto_cliente_url: fotoClienteUrl,
        midia_status: 'pronta',
      })
      .eq('id', input.notaId)
  }
  catch (error) {
    console.error('[notas:media] create upload falhou:', error instanceof Error ? error.message : error)
    await (admin as any).from(NOTAS_TABLE).update({ midia_status: 'erro' }).eq('id', input.notaId)
  }
}

type RetiradaMediaInput = {
  notaId: string
  requestId: string | null
  ownerUserId: string
  fotoDataUrl: string
}

const runRetiradaMedia = async (input: RetiradaMediaInput) => {
  const admin = createAdminClient()
  try {
    const url = await uploadDataUrl(admin, input.ownerUserId, 'retirada', input.fotoDataUrl)

    // Re-lê o histórico e anexa a foto na entrada certa (pelo request_id).
    const { data: row } = await (admin as any)
      .from(NOTAS_TABLE)
      .select('historico_retiradas')
      .eq('id', input.notaId)
      .single()

    const historico = Array.isArray(row?.historico_retiradas)
      ? (row.historico_retiradas as NotaRetiradaHistoricoItem[])
      : []
    const historicoAtualizado = historico.map(item =>
      item?.request_id === input.requestId ? { ...item, fotos: url ? [url] : [] } : item,
    )

    await (admin as any)
      .from(NOTAS_TABLE)
      .update({
        comprovante_retirada_url: url,
        historico_retiradas: historicoAtualizado,
        midia_status: 'pronta',
      })
      .eq('id', input.notaId)
  }
  catch (error) {
    console.error('[notas:media] retirada upload falhou:', error instanceof Error ? error.message : error)
    await (admin as any).from(NOTAS_TABLE).update({ midia_status: 'erro' }).eq('id', input.notaId)
  }
}

/** Dispara o upload de imagens da criação de nota em segundo plano (não aguarda). */
export const processCreateNotaMediaInBackground = (input: CreateMediaInput): void => {
  void runCreateNotaMedia(input)
}

/** Dispara o upload da foto de retirada em segundo plano (não aguarda). */
export const processRetiradaMediaInBackground = (input: RetiradaMediaInput): void => {
  void runRetiradaMedia(input)
}
