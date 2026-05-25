import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, NotaRetiradaRow } from '../../../app/types/database.types'
import { signNotaStorageUrls } from '../../utils/storage'

type SupabaseDbError = {
  code?: string
  message?: string
}

const getRestoreErrorResponse = (error: SupabaseDbError) => {
  const code = String(error.code || '')
  const message = String(error.message || '')

  if (code === '42501') {
    return {
      statusCode: 403,
      statusMessage: 'Apenas administradores podem restaurar notas.',
    }
  }

  if (code === 'P0002' || /nota nao encontrada/i.test(message)) {
    return {
      statusCode: 404,
      statusMessage: 'Nota nao encontrada.',
    }
  }

  if (code === '23514' || /lixeira|restaurada|alteracao invalida/i.test(message)) {
    return {
      statusCode: 409,
      statusMessage: message || 'A nota nao pode ser restaurada neste momento.',
    }
  }

  return {
    statusCode: 500,
    statusMessage: 'Nao foi possivel restaurar a nota.',
  }
}

export const restoreNotaRetirada = async (client: SupabaseClient<Database>, notaId: string) => {
  const { data, error } = await client.rpc('restaurar_nota_retirada', {
    p_nota_id: notaId,
  })

  if (error) {
    console.error('[notas/restore] rpc error:', error.message)
    throw createError(getRestoreErrorResponse(error))
  }

  const restored = (Array.isArray(data) ? data[0] : data) as NotaRetiradaRow | null

  if (!restored?.id) {
    throw createError({
      statusCode: 500,
      statusMessage: 'O servidor nao retornou a nota restaurada.',
    })
  }

  return await signNotaStorageUrls(client, restored)
}
