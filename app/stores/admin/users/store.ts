import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { $fetch } from 'ofetch'
import { useToast } from '../../../composables/useToast'

import type {
  AdminDeleteUserResponse,
  AdminInviteUserResponse,
  AdminInviteUserPayload,
  AdminResetUserPasswordResponse,
  AdminUsersListQuery,
  AdminUsersSortBy,
  AdminUsersSortDir,
  AdminUpdateUserRolePayload,
  AdminUpdateUserStatusPayload,
  AdminUserRecord,
  AdminUsersListResponse,
} from '../../../../shared/types/AdminUsers'

export const useAdminUsersStore = defineStore('admin-users', () => {
  const usuarios = ref<AdminUserRecord[]>([])
  const { success: showSuccess, error: showError } = useToast()

  const loadingUsuarios = ref(false)
  const savingUsuario = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const page = ref(1)
  const pageSize = ref(20)
  const totalItems = ref(0)
  const totalPages = ref(1)
  const sortBy = ref<AdminUsersSortBy>('membro_desde')
  const sortDir = ref<AdminUsersSortDir>('desc')

  const stats = computed(() => ({
    total: usuarios.value.length,
    ativos: usuarios.value.filter(user => user.status === 'ativo').length,
    inativos: usuarios.value.filter(user => user.status === 'inativo').length,
    pendentes: usuarios.value.filter(user => user.status === 'pendente').length,
    admins: usuarios.value.filter(user => user.role === 'admin' && user.status !== 'inativo').length,
  }))

  const clearError = () => {
    errorMessage.value = ''
  }

  const clearSuccess = () => {
    successMessage.value = ''
  }

  const upsertLocalUser = (updatedUser: AdminUserRecord) => {
    const index = usuarios.value.findIndex(user => user.auth_uid === updatedUser.auth_uid)

    if (index === -1) {
      usuarios.value.unshift(updatedUser)
      return
    }

    usuarios.value[index] = updatedUser
  }

  const fetchUsuarios = async (filters: AdminUsersListQuery = {}) => {
    loadingUsuarios.value = true
    clearError()

    try {
      const data = await $fetch<AdminUsersListResponse>('/api/admin/users', {
        query: {
          search: filters.search?.trim() || undefined,
          status: filters.status && filters.status !== 'todos' ? filters.status : undefined,
          sort_by: filters.sort_by || sortBy.value,
          sort_dir: filters.sort_dir || sortDir.value,
          page: filters.page || page.value,
          page_size: filters.page_size || pageSize.value,
        },
      })

      usuarios.value = data.users || []
      page.value = data.meta?.page || 1
      pageSize.value = data.meta?.page_size || (filters.page_size || pageSize.value)
      totalItems.value = data.meta?.total_items || usuarios.value.length
      totalPages.value = data.meta?.total_pages || 1
      sortBy.value = (filters.sort_by || sortBy.value)
      sortDir.value = (filters.sort_dir || sortDir.value)
      return usuarios.value
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Falha ao carregar usuarios do painel admin.'
      return []
    }
    finally {
      loadingUsuarios.value = false
    }
  }

  const updateUserRole = async (authUid: string, payload: AdminUpdateUserRolePayload) => {
    savingUsuario.value = true
    clearError()

    try {
      const data = await $fetch<{ user: AdminUserRecord }>(`/api/admin/users/${authUid}/role`, {
        method: 'PATCH',
        body: payload,
      })

      if (data.user) {
        upsertLocalUser(data.user)
      }

      showSuccess('Permissão do usuário atualizada com sucesso!')
      return data.user || null
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao atualizar permissao do usuario.'
      errorMessage.value = msg
      showError(msg)
      return null
    }

    finally {
      savingUsuario.value = false
    }
  }

  const updateUserStatus = async (authUid: string, payload: AdminUpdateUserStatusPayload) => {
    savingUsuario.value = true
    clearError()

    try {
      const data = await $fetch<{ user: AdminUserRecord }>(`/api/admin/users/${authUid}/status`, {
        method: 'PATCH',
        body: payload,
      })

      if (data.user) {
        upsertLocalUser(data.user)
      }

      showSuccess('Status do usuário atualizado com sucesso!')
      return data.user || null
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao atualizar status do usuario.'
      errorMessage.value = msg
      showError(msg)
      return null
    }

    finally {
      savingUsuario.value = false
    }
  }

  const inviteUser = async (payload: AdminInviteUserPayload) => {
    savingUsuario.value = true
    clearError()
    clearSuccess()

    try {
      const data = await $fetch<AdminInviteUserResponse>('/api/admin/users/invite', {
        method: 'POST',
        body: payload,
      })

      const msg = data.message || 'Convite enviado com sucesso.'
      successMessage.value = msg
      showSuccess(msg)
      await fetchUsuarios()
      return true
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao enviar convite do usuário.'
      errorMessage.value = msg
      showError(msg)
      return false
    }

    finally {
      savingUsuario.value = false
    }
  }

  const deleteUser = async (authUid: string) => {
    savingUsuario.value = true
    clearError()
    clearSuccess()

    try {
      const data = await $fetch<AdminDeleteUserResponse>(`/api/admin/users/${authUid}`, {
        method: 'DELETE',
      })

      usuarios.value = usuarios.value.filter(user => user.auth_uid !== authUid)
      const msg = data.message || 'Usuário excluído com sucesso.'
      successMessage.value = msg
      showSuccess(msg)
      return true
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao excluir usuário.'
      errorMessage.value = msg
      showError(msg)
      return false
    }

    finally {
      savingUsuario.value = false
    }
  }

  const resetUserPassword = async (authUid: string) => {
    savingUsuario.value = true
    clearError()
    clearSuccess()

    try {
      const data = await $fetch<AdminResetUserPasswordResponse>(`/api/admin/users/${authUid}/reset-password`, {
        method: 'POST',
      })

      const msg = data.message || 'Senha redefinida com sucesso.'
      successMessage.value = msg
      showSuccess(msg)
      return data
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao redefinir senha do usuário.'
      errorMessage.value = msg
      showError(msg)
      return null
    }

    finally {
      savingUsuario.value = false
    }
  }

  return {
    usuarios,
    loadingUsuarios,
    savingUsuario,
    errorMessage,
    successMessage,
    page,
    pageSize,
    totalItems,
    totalPages,
    sortBy,
    sortDir,
    stats,
    clearError,
    clearSuccess,
    fetchUsuarios,
    updateUserRole,
    updateUserStatus,
    inviteUser,
    deleteUser,
    resetUserPassword,
  }
})
