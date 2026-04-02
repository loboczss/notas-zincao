import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session, User } from '@supabase/supabase-js'
import { $fetch } from 'ofetch'
import { useSupabaseClient } from '#imports'
import type { SignInPayload, SignUpPayload } from '../../../shared/types/Auth'
import type { UserProfile } from '../../../shared/types/Profile'
import type { Database } from '../../types/database.types'
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
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      errorMessage.value = error.message
      return
    }

    session.value = data.session
  }

  const getMe = async () => {
    clearError()

    try {
      const response = await $fetch<{
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
      return response
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível obter os dados do usuário.'
      errorMessage.value = message
      return null
    }
  }

  const signIn = async (payload: SignInPayload) => {
    clearError()
    loading.value = true

    const { error } = await signInWithEmailAndPassword(supabase, payload)

    loading.value = false

    if (error) {
      errorMessage.value = error.message
      return false
    }

    await fetchSession()
    await getMe()
    return true
  }

  const signUp = async (payload: SignUpPayload) => {
    clearError()
    loading.value = true

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

    loading.value = false

    if (error) {
      errorMessage.value = error.message
      return false
    }

    return true
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    session.value = null
    profile.value = null
  }

  const updateProfile = async (data: { nome?: string; foto_perfil?: string }) => {
    clearError()
    loading.value = true

    try {
      const updated = await $fetch<UserProfile>('/api/auth/profile', {
        method: 'PATCH',
        body: data,
      })
      profile.value = updated
      return true
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar perfil.'
      errorMessage.value = message
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
  }
})
