import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
  PROFILE_ADMIN_SELECT,
  toAdminUserRecord,
} from './_helpers'
import type { AdminUsersListResponse } from '../../../../shared/types/AdminUsers'

export default defineEventHandler(async (event): Promise<AdminUsersListResponse> => {
  const authUid = await getCurrentAuthUid(event)
  const client = await getAdminUsersClient(event)

  await assertAdminAccess(client, authUid)

  const { data, error } = await (client as any)
    .from('profiles')
    .select(PROFILE_ADMIN_SELECT)
    .order('updated_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[api/admin/users] list error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nao foi possivel carregar os usuarios.',
    })
  }

  const query = getQuery(event)
  const search = String(query.search || '').trim().toLowerCase()
  const status = String(query.status || 'todos').trim().toLowerCase()
  const sortBy = String(query.sort_by || '').trim().toLowerCase()
  const sortDir = String(query.sort_dir || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc'
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1)
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(query.page_size || '20'), 10) || 20))

  let users = ((data || []) as any[]).map(toAdminUserRecord)

  if (status === 'ativo' || status === 'inativo' || status === 'pendente') {
    users = users.filter(user => user.status === status)
  }

  if (search) {
    users = users.filter((user) => {
      const nome = String(user.nome || '').toLowerCase()
      const email = String(user.email || '').toLowerCase()
      return nome.includes(search) || email.includes(search)
    })
  }

  if (sortBy === 'nome' || sortBy === 'email' || sortBy === 'status' || sortBy === 'role' || sortBy === 'membro_desde') {
    const statusRank: Record<string, number> = {
      ativo: 1,
      pendente: 2,
      inativo: 3,
    }

    users = users.slice().sort((a, b) => {
      let aValue = ''
      let bValue = ''

      if (sortBy === 'membro_desde') {
        aValue = String(a.membro_desde || '')
        bValue = String(b.membro_desde || '')
      }
      else if (sortBy === 'status') {
        const aRank = statusRank[String(a.status || '').toLowerCase()] || 99
        const bRank = statusRank[String(b.status || '').toLowerCase()] || 99
        return sortDir === 'asc' ? aRank - bRank : bRank - aRank
      }
      else {
        aValue = String(a[sortBy] || '').toLowerCase()
        bValue = String(b[sortBy] || '').toLowerCase()
      }

      if (aValue < bValue) {
        return sortDir === 'asc' ? -1 : 1
      }

      if (aValue > bValue) {
        return sortDir === 'asc' ? 1 : -1
      }

      return 0
    })
  }

  const totalItems = users.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const paginatedUsers = users.slice(start, start + pageSize)

  return {
    users: paginatedUsers,
    stats: {
      total: users.length,
      ativos: users.filter(user => user.status === 'ativo').length,
      inativos: users.filter(user => user.status === 'inativo').length,
      pendentes: users.filter(user => user.status === 'pendente').length,
      admins: users.filter(user => user.role === 'admin' && user.status !== 'inativo').length,
    },
    meta: {
      page: safePage,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
    },
  }
})
