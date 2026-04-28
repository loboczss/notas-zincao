import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '../../../../app/types/database.types'
import type { NotaAdminEditRequest, NotaRetiradaHistoricoItem, NotaProduto } from '../../../../shared/types/NotasRetirada'
import { vincularProdutosAoEstoque } from '../../../services/estoque/match-produtos'

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return undefined
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const toInteger = (value: unknown) => {
  const parsed = toNumber(value)
  if (parsed === undefined) return undefined
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined
}

const normalizeDigits = (value: unknown) => {
  if (value === null) return null
  const raw = String(value || '').trim()
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  return digits || null
}

const normalizeProdutos = (produtos: NotaProduto[] | undefined) => {
  if (!Array.isArray(produtos)) return [] as NotaProduto[]

  return produtos
    .map((item) => {
      const nome = String(item?.nome || '').trim()
      if (!nome) return null

      const quantidade = toNumber(item?.quantidade)
      const valorUnitario = toNumber(item?.valor_unitario)
      const valorTotal = toNumber(item?.valor_total)
      const quantidadeRetirada = toNumber(item?.quantidade_retirada)
      const unidade = String(item?.unidade || item?.tipo_unidade || '').trim()
      const embalagem = String(item?.embalagem || '').trim()
      const tipoUnidade = String(item?.tipo_unidade || unidade || '').trim()
      const confidence = toNumber(item?.confidence)
      const idProdutoEstoque = toInteger(item?.id_produto_estoque)
      const tipoProdutoRaw = item?.tipo_produto
      const tipoProduto = typeof tipoProdutoRaw === 'string' ? tipoProdutoRaw.trim() || null : null

      return {
        nome,
        ...(quantidade !== undefined ? { quantidade } : {}),
        ...(valorUnitario !== undefined ? { valor_unitario: valorUnitario } : {}),
        ...(valorTotal !== undefined ? { valor_total: valorTotal } : {}),
        ...(quantidadeRetirada !== undefined ? { quantidade_retirada: Math.max(0, quantidadeRetirada) } : {}),
        ...(unidade ? { unidade } : {}),
        ...(tipoUnidade ? { tipo_unidade: tipoUnidade } : {}),
        ...(embalagem ? { embalagem } : {}),
        ...(confidence !== undefined ? { confidence } : {}),
        ...(idProdutoEstoque !== undefined ? { id_produto_estoque: idProdutoEstoque } : {}),
        ...(tipoProduto !== null ? { tipo_produto: tipoProduto } : {}),
      } as NotaProduto
    })
    .filter((item): item is NotaProduto => item !== null)
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const authUid = user.id || user.sub
  if (!authUid) {
    throw createError({ statusCode: 401, statusMessage: 'Authenticated user id not found.' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Nota id is required.' })
  }

  const client = await serverSupabaseClient<Database>(event)

  const { data: profile, error: profileError } = await (client as any)
    .from('profiles')
    .select('nome, email, role')
    .eq('auth_uid', authUid)
    .maybeSingle()

  if (profileError) {
    console.error('[api/notas/:id/edit] profile error:', profileError.message)
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível validar permissões.' })
  }

  const role = String(profile?.role || '').trim().toLowerCase()
  if (role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas administradores podem editar notas.' })
  }

  const body = await readBody<NotaAdminEditRequest>(event)

  const hasAnyChange =
    body?.nome_cliente !== undefined ||
    body?.documento_cliente !== undefined ||
    body?.telefone_cliente !== undefined ||
    body?.contato_id !== undefined ||
    body?.produtos !== undefined ||
    body?.observacoes !== undefined

  if (!hasAnyChange) {
    throw createError({ statusCode: 400, statusMessage: 'Nenhum campo de edição informado.' })
  }

  const { data: notaAtual, error: notaError } = await (client as any)
    .from('notas_retirada')
    .select('id, nome_cliente, documento_cliente, telefone_cliente, contato_id, produtos, observacoes, historico_retiradas')
    .eq('id', id)
    .single()

  if (notaError || !notaAtual) {
    throw createError({ statusCode: 404, statusMessage: 'Nota não encontrada.' })
  }

  const payload: Record<string, unknown> = {}

  if (body.nome_cliente !== undefined) {
    const nomeCliente = String(body.nome_cliente || '').trim()
    if (!nomeCliente) {
      throw createError({ statusCode: 400, statusMessage: 'nome_cliente não pode ficar vazio.' })
    }
    payload.nome_cliente = nomeCliente
  }

  if (body.documento_cliente !== undefined) {
    payload.documento_cliente = normalizeDigits(body.documento_cliente)
  }

  if (body.telefone_cliente !== undefined) {
    payload.telefone_cliente = normalizeDigits(body.telefone_cliente)
  }

  if (body.contato_id !== undefined) {
    const contato = String(body.contato_id || '').trim()
    payload.contato_id = contato || null
  }

  if (body.observacoes !== undefined) {
    const obs = String(body.observacoes || '').trim()
    payload.observacoes = obs || null
  }

  if (body.produtos !== undefined) {
    const produtosNormalizados = normalizeProdutos(body.produtos)
    if (!produtosNormalizados.length) {
      throw createError({ statusCode: 400, statusMessage: 'Informe ao menos um item válido.' })
    }

    const produtosVinculados = await vincularProdutosAoEstoque(client as any, produtosNormalizados)
    payload.produtos = produtosVinculados
  }

  const alteracoes: string[] = []
  if (body.nome_cliente !== undefined && notaAtual.nome_cliente !== payload.nome_cliente) {
    alteracoes.push(`Nome: "${notaAtual.nome_cliente || 'Vazio'}" -> "${payload.nome_cliente || 'Vazio'}"`)
  }
  if (body.documento_cliente !== undefined && notaAtual.documento_cliente !== payload.documento_cliente) {
    alteracoes.push(`Doc: "${notaAtual.documento_cliente || 'Vazio'}" -> "${payload.documento_cliente || 'Vazio'}"`)
  }
  if (body.telefone_cliente !== undefined && notaAtual.telefone_cliente !== payload.telefone_cliente) {
    alteracoes.push(`Tel: "${notaAtual.telefone_cliente || 'Vazio'}" -> "${payload.telefone_cliente || 'Vazio'}"`)
  }
  if (body.contato_id !== undefined && notaAtual.contato_id !== payload.contato_id) {
    alteracoes.push(`Contato ID: "${notaAtual.contato_id || 'Vazio'}" -> "${payload.contato_id || 'Vazio'}"`)
  }
  if (body.observacoes !== undefined && notaAtual.observacoes !== payload.observacoes) {
    alteracoes.push(`Obs: "${notaAtual.observacoes || 'Vazio'}" -> "${payload.observacoes || 'Vazio'}"`)
  }
  if (body.produtos !== undefined) {
    const oldProducts = Array.isArray(notaAtual.produtos) ? (notaAtual.produtos as any[]) : []
    const newProducts = Array.isArray(payload.produtos) ? (payload.produtos as any[]) : []
    const prodDiffs: string[] = []

    newProducts.forEach((newP, idx) => {
      const oldP = oldProducts.find(p => p.nome === newP.nome) || oldProducts[idx]
      if (!oldP) {
        prodDiffs.push(`+ Adicionado: ${newP.nome} (${newP.quantidade || 0} Qtd)`)
      } else {
        const details: string[] = []
        if (newP.quantidade !== undefined && Number(oldP.quantidade) !== Number(newP.quantidade)) {
          details.push(`Qtd: ${oldP.quantidade ?? 0} -> ${newP.quantidade}`)
        }
        if (newP.quantidade_retirada !== undefined && Number(oldP.quantidade_retirada) !== Number(newP.quantidade_retirada)) {
          details.push(`Entregue: ${oldP.quantidade_retirada ?? 0} -> ${newP.quantidade_retirada}`)
        }
        if (newP.valor_unitario !== undefined && Number(oldP.valor_unitario) !== Number(newP.valor_unitario)) {
          details.push(`Preço: ${oldP.valor_unitario ?? 0} -> ${newP.valor_unitario}`)
        }
        if (newP.id_produto_estoque !== undefined && oldP.id_produto_estoque !== newP.id_produto_estoque) {
          details.push(`Vínculo: #${oldP.id_produto_estoque ?? 'Nenhum'} -> #${newP.id_produto_estoque}`)
        }
        
        if (details.length > 0) {
          prodDiffs.push(`"${newP.nome}": [${details.join(', ')}]`)
        }
      }
    })

    oldProducts.forEach(oldP => {
      const stillExists = newProducts.some(newP => newP.nome === oldP.nome)
      if (!stillExists) {
        prodDiffs.push(`- Removido: ${oldP.nome}`)
      }
    })

    if (prodDiffs.length > 0) {
      alteracoes.push(`Itens: (${prodDiffs.join(' | ')})`)
    }
  }


  const descricaoLog = alteracoes.length > 0 
    ? `Edição dos dados da nota. Alterações: ${alteracoes.join('; ')}` 
    : 'Edição administrativa dos dados da nota.'

  const historicoAtual = Array.isArray(notaAtual.historico_retiradas)
    ? notaAtual.historico_retiradas
    : []

  const responsavelNome = String(profile?.nome || profile?.email || '').trim() || authUid
  const eventoHistorico: NotaRetiradaHistoricoItem = {
    data: new Date().toISOString(),
    responsavel_id: authUid,
    responsavel_nome: responsavelNome,
    fotos: [],
    itens_retirados: [],
    observacoes: descricaoLog,
    usuario_id: authUid,
  }


  payload.historico_retiradas = [...historicoAtual, eventoHistorico]

  const { data, error } = await (client as any)
    .from('notas_retirada')
    .update(payload)
    .eq('id', id)
    .select('id, contato_id, nome_cliente, documento_cliente, telefone_cliente, numero_nota, serie_nota, data_compra, data_retirada, valor_total, desconto_total, status_retirada, criado_em, produtos, foto_url, foto_cliente_url, comprovante_retirada_url, historico_retiradas, atualizado_em')
    .single()

  if (error) {
    console.error('[api/notas/:id/edit] update error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível salvar as alterações da nota.' })
  }

  await (client as any)

    .from('notas_historico_edicao')
    .insert({
      nota_id: id,
      user_id: authUid,
      dados_anteriores: notaAtual,
      dados_novos: payload
    })

  return {

    success: true,
    nota: data,
  }
})
