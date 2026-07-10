// Dimensao de vendedores: idvendedor -> nome. O idvendedor aparece nos itens de
// venda, mas o CPF (e portanto o nome) so existe no cabecalho. Entao lemos uma
// janela recente de cabecalhos para montar os pares idvendedor->cpf dos vendedores
// ativos, resolvemos o nome em cad_pessoas e gravamos em integrim_vendedores.
//
// Roda separado do sync principal de vendas (nao engorda aquele pipeline). Custo
// limitado: poucas paginas de cabecalho por empresa (vendedores ativos aparecem
// nas notas mais recentes) + uma consulta cad_pessoas por CPF distinto.

import { createTokenManager, fetchDocumentosByDatePage, fetchPessoaByCpf } from './sync/client'
import { getIntegrimNotasConfig } from './sync/config'
import { createAdminClient } from './sync/repository'
import { digitsOnly, formatIsoDate, trimmedOrNull } from './sync/utils'
import { toInteger } from '../stock-integrin/sync/utils'

export type SyncVendedoresResult = {
  success: boolean
  vendedores: number
  sem_nome: number
}

export type SyncVendedoresOptions = {
  windowMonths?: number
  maxPagesPerEmpresa?: number
}

export const syncVendedores = async (
  options: SyncVendedoresOptions = {},
): Promise<SyncVendedoresResult> => {
  const config = getIntegrimNotasConfig()
  const windowMonths = Math.max(1, options.windowMonths ?? 6)
  const maxPages = Math.max(1, options.maxPagesPerEmpresa ?? 8)
  const tokens = await createTokenManager(config)

  const now = new Date()
  const end = formatIsoDate(now)
  const start = formatIsoDate(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - windowMonths, now.getUTCDate())),
  )

  // 1) Coleta pares idvendedor -> cpf dos cabecalhos recentes (para de ler uma
  //    empresa assim que acaba a janela ou atinge o teto de paginas).
  const idToCpf = new Map<number, string>()
  for (const idempresa of config.companyIds) {
    for (let page = 1; page <= maxPages; page += 1) {
      const res = await fetchDocumentosByDatePage(config, tokens, idempresa, start, end, page)
      for (const rec of res.data) {
        const idv = toInteger(rec.idvendedor) || 0
        const cpf = digitsOnly(rec.cpfvendedor)
        if (idv && cpf && !idToCpf.has(idv)) idToCpf.set(idv, cpf)
      }
      if (!res.hasNext || !res.data.length) break
    }
  }

  // 2) Resolve nome por CPF (cache por CPF; vendedores podem repetir CPF).
  const cpfToNome = new Map<string, string | null>()
  const rows: Array<{ idvendedor: number, cpf: string, nome: string | null }> = []
  for (const [idvendedor, cpf] of idToCpf) {
    if (!cpfToNome.has(cpf)) {
      try {
        const res = await fetchPessoaByCpf(config, tokens, cpf)
        cpfToNome.set(cpf, res.data.length ? trimmedOrNull(res.data[0]?.nome) : null)
      }
      catch {
        cpfToNome.set(cpf, null)
      }
    }
    rows.push({ idvendedor, cpf, nome: cpfToNome.get(cpf) ?? null })
  }

  // 3) Upsert na dimensao.
  const client = createAdminClient()
  const nowIso = new Date().toISOString()
  if (rows.length) {
    const { error } = await (client as any)
      .from('integrim_vendedores')
      .upsert(rows.map(r => ({ ...r, updated_at: nowIso })), { onConflict: 'idvendedor' })
    if (error) {
      console.error('[integrim-notas] upsert vendedores failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Nao foi possivel gravar a dimensao de vendedores.' })
    }
  }

  return {
    success: true,
    vendedores: rows.length,
    sem_nome: rows.filter(r => !r.nome).length,
  }
}
