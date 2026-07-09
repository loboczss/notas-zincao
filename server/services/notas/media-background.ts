import { createAdminClient } from '../stock-integrin/sync/repository'
import { uploadNotaImageDataUrl } from '../../utils/storage'
import type { NotaRetiradaHistoricoItem } from '../../../shared/types/NotasRetirada'

// Upload de imagem em segundo plano — usado apenas pela retirada. O comprovante
// de retirada não é evidência fiscal, então não bloqueia a resposta: sobe pro
// Backblaze aqui e atualiza a linha/midia_status quando termina.
//
// O cadastro NÃO passa por aqui: o cupom (evidência fiscal) é enviado de forma
// síncrona no endpoint de create, garantindo que nenhuma nota exista sem foto.

const NOTAS_TABLE = 'notas_retirada'

type RetiradaMediaInput = {
  notaId: string
  requestId: string | null
  ownerUserId: string
  fotoDataUrl: string
}

const runRetiradaMedia = async (input: RetiradaMediaInput) => {
  const admin = createAdminClient()
  try {
    const url = await uploadNotaImageDataUrl(admin, input.ownerUserId, 'retirada', input.fotoDataUrl)

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

/** Dispara o upload da foto de retirada em segundo plano (não aguarda). */
export const processRetiradaMediaInBackground = (input: RetiradaMediaInput): void => {
  void runRetiradaMedia(input)
}
