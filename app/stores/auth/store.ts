import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session, User } from '@supabase/supabase-js'
import { useSupabaseClient } from '#imports'
import { getApiErrorMessage, isNetworkFetchError, isUnauthorizedError } from '../../utils/api-errors'
import { getApiFetch } from '../../utils/api-fetch'
import {
  cacheAuthProfile,
  clearCachedAuthState,
  getCachedAuthProfile,
} from '../../utils/auth-session-cache'
import { clearUserScopedOfflineData } from '../../utils/offline-db'
import { useNotasStore } from '../notas/store'
import { useEstoqueStore } from '../estoque/store'
import { useStockIntegrinStore } from '../stock-integrin/store'
import { useCrmStore } from '../crm/store'
import { useAdminUsersStore } from '../admin/users/store'
import type { SignInPayload, SignUpPayload } from '../../../shared/types/Auth'
import type { UserProfile } from '../../../shared/types/Profile'
import type { Database } from '../../types/database.types'
import { AppRoute } from '../../constants/routes'
import { signInWithEmailAndPassword } from './login'

export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabaseClient<Database>()

  const session = ref<Session | null>(null)
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')

  const user = computed<User | null>(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!user.value)

  const clearError = () => {
    errorMessage.value = ''
  }

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        throw error
      }

      session.value = data.session
    }
    catch (error) {
      if (isUnauthorizedError(error)) {
        clearCachedAuthState()
        session.value = null
        return
      }

      errorMessage.value = getApiErrorMessage(error, 'Nao foi possivel recuperar a sessao.')
    }
  }

  const getMe = async () => {
    clearError()

    try {
      const response = await getApiFetch()<{
        user: {
          id: string
          email: string | null
          metadata?: Record<string, unknown> | null
        }
        profile: UserProfile | null
      }>('/api/auth/me')

      if (session.value?.user) {
        session.value = {
          ...session.value,
          user: {
            ...session.value.user,
            email: response.user.email || session.value.user.email,
            user_metadata: response.user.metadata || session.value.user.user_metadata,
          },
        }
      }

      profile.value = response.profile
      cacheAuthProfile(response.profile)
      return response
    }
    catch (error) {
      const cachedProfile = getCachedAuthProfile()

      if (cachedProfile && (isNetworkFetchError(error) || (import.meta.client && !navigator.onLine))) {
        profile.value = cachedProfile
        return null
      }

      const message = getApiErrorMessage(error, 'Nao foi possivel obter os dados do usuario.')
      errorMessage.value = message
      return null
    }
  }

  const signIn = async (payload: SignInPayload) => {
    clearError()
    loading.value = true

    try {
      const { data, error } = await signInWithEmailAndPassword(supabase, payload)

      if (error) {
        errorMessage.value = getApiErrorMessage(error, 'Nao foi possivel entrar na conta.')
        return false
      }

      if (data.session) {
        session.value = data.session
      }
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Nao foi possivel entrar na conta.')
      return false
    }
    finally {
      loading.value = false
    }

    await fetchSession()
    await getMe()
    return true
  }

  const signUp = async (payload: SignUpPayload) => {
    clearError()
    loading.value = true

    try {
      const { error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            name: payload.nome,
            full_name: payload.nome,
            nome: payload.nome,
          },
          emailRedirectTo: payload.redirectTo,
        },
      })

      if (error) {
        errorMessage.value = getApiErrorMessage(error, 'Nao foi possivel criar a conta.')
        return false
      }
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Nao foi possivel criar a conta.')
      return false
    }
    finally {
      loading.value = false
    }

    return true
  }

  const resetUserScopedStores = () => {
    useNotasStore().reset()
    useEstoqueStore().reset()
    useStockIntegrinStore().reset()
    useCrmStore().reset()
    useAdminUsersStore().reset()
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    }
    finally {
      clearCachedAuthState()
      session.value = null
      profile.value = null
      resetUserScopedStores()
      if (import.meta.client) {
        try {
          await clearUserScopedOfflineData()
        }
        catch (error) {
          console.warn('[auth] failed to clear offline data on signOut', error)
        }
      }
    }
  }

  const updateProfile = async (data: { nome?: string; foto_perfil?: string }) => {
    clearError()
    loading.value = true

    try {
      const updated = await getApiFetch()<UserProfile>('/api/auth/profile', {
        method: 'PATCH',
        body: data,
      })
      profile.value = updated
      cacheAuthProfile(updated)
      return true
    }
    catch (error) {
      const message = getApiErrorMessage(error, 'Erro ao atualizar perfil.')
      errorMessage.value = message
      return false
    }
    finally {
      loading.value = false
    }
  }

  const resetPassword = async (email: string) => {
    clearError()
    loading.value = true

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${AppRoute.redefinirSenha}`,
      })

      if (error) {
        errorMessage.value = getApiErrorMessage(error, 'Erro ao solicitar recuperacao de senha.')
        return false
      }

      return true
    }
    catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Erro ao solicitar recuperacao de senha.')
      return false
    }
    finally {
      loading.value = false
    }
  }

  return {
    user,
    session,
    profile,
    loading,
    errorMessage,
    isAuthenticated,
    clearError,
    fetchSession,
    getMe,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
  }
})
