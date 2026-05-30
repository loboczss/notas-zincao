<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { EmailOtpType, Session } from '@supabase/supabase-js'
import { AlertCircle, CheckCircle2, LockKeyhole } from 'lucide-vue-next'
import { useSupabaseClient } from '#imports'
import { useToast } from '../composables/useToast'
import { getApiErrorMessage } from '../utils/api-errors'
import { AppRoute } from '../constants/routes'
import { useAuthStore } from '../stores'
import type { Database } from '../types/database.types'

type PageStatus = 'checking' | 'ready' | 'saving' | 'success' | 'error'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient<Database>()
const authStore = useAuthStore()
const { success: showSuccess, error: showError } = useToast()

const status = ref<PageStatus>('checking')
const statusMessage = ref('Validando o link de recuperacao...')
const form = reactive({
  senha: '',
  confirmacao: '',
})

const isBusy = computed(() => status.value === 'checking' || status.value === 'saving')
const canSubmit = computed(() => {
  return status.value === 'ready'
    && form.senha.length >= 6
    && form.senha === form.confirmacao
})

const getQueryValue = (key: string) => {
  const value = route.query[key]
  return Array.isArray(value) ? String(value[0] || '') : String(value || '')
}

const getHashParams = () => {
  if (!import.meta.client) return new URLSearchParams()
  const hash = (route.hash || window.location.hash || '').replace(/^#/, '')
  return new URLSearchParams(hash)
}

const setError = (message: string) => {
  status.value = 'error'
  statusMessage.value = message
}

const cleanRecoveryUrl = async () => {
  if (!import.meta.client) return
  if (!route.fullPath.includes('?') && !route.hash) return
  await router.replace(AppRoute.redefinirSenha)
}

const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

const establishRecoverySession = async (): Promise<Session | null> => {
  const hashParams = getHashParams()
  const queryError = getQueryValue('error_description') || getQueryValue('error')
  const hashError = hashParams.get('error_description') || hashParams.get('error')

  if (queryError || hashError) {
    throw new Error(queryError || hashError || 'Link de recuperacao invalido.')
  }

  const tokenHash = getQueryValue('token_hash')
  const code = getQueryValue('code')
  const queryType = getQueryValue('type')
  const hashType = hashParams.get('type') || ''
  const type = (queryType || hashType || 'recovery') as EmailOtpType

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (error) throw error
    return data.session || await getCurrentSession()
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return data.session || await getCurrentSession()
  }

  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) throw error
    return data.session || await getCurrentSession()
  }

  return getCurrentSession()
}

const prepararPagina = async () => {
  status.value = 'checking'
  statusMessage.value = 'Validando o link de recuperacao...'

  try {
    const session = await establishRecoverySession()

    if (!session) {
      setError('Nao foi possivel validar este link. Solicite uma nova recuperacao de senha.')
      return
    }

    status.value = 'ready'
    statusMessage.value = 'Digite uma nova senha para continuar.'
    await cleanRecoveryUrl()
  }
  catch (error) {
    console.error('[redefinir-senha]', error)
    setError(getApiErrorMessage(error, 'Link expirado ou invalido. Solicite uma nova recuperacao de senha.'))
  }
}

const salvarSenha = async () => {
  if (status.value !== 'ready') return

  if (form.senha.length < 6) {
    showError('A senha deve ter pelo menos 6 caracteres.')
    return
  }

  if (form.senha !== form.confirmacao) {
    showError('As senhas nao conferem.')
    return
  }

  status.value = 'saving'
  statusMessage.value = 'Salvando sua nova senha...'

  try {
    const { error } = await supabase.auth.updateUser({ password: form.senha })
    if (error) throw error

    form.senha = ''
    form.confirmacao = ''
    status.value = 'success'
    statusMessage.value = 'Senha redefinida com sucesso. Entre novamente com sua nova senha.'
    showSuccess('Senha redefinida com sucesso.')
    await authStore.signOut()
  }
  catch (error) {
    console.error('[redefinir-senha] update password', error)
    status.value = 'ready'
    statusMessage.value = 'Digite uma nova senha para continuar.'
    showError(getApiErrorMessage(error, 'Nao foi possivel redefinir a senha.'))
  }
}

const voltarLogin = async () => {
  await router.push(AppRoute.login)
}

onMounted(() => {
  prepararPagina()
})
</script>

<template>
  <LayoutAuthPageShell
    title="Redefinir senha"
    description="Crie uma nova senha para acessar sua conta."
  >
    <template #headerAside>
      <DarkModeToggle />
    </template>

    <Card padding-class="p-5">
      <div class="mb-5 flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
          :class="status === 'error'
            ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
            : status === 'success'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'"
        >
          <AlertCircle v-if="status === 'error'" class="h-5 w-5" />
          <CheckCircle2 v-else-if="status === 'success'" class="h-5 w-5" />
          <LockKeyhole v-else class="h-5 w-5" />
        </div>

        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-slate-950 dark:text-slate-50">
            Nova senha
          </h2>
          <p class="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {{ statusMessage }}
          </p>
        </div>
      </div>

      <form v-if="status === 'ready' || status === 'saving'" class="space-y-4" @submit.prevent="salvarSenha">
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-600 dark:text-slate-300">
            Nova senha
          </label>
          <Input
            v-model="form.senha"
            type="password"
            autocomplete="new-password"
            placeholder="Minimo 6 caracteres"
            :disabled="isBusy"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-600 dark:text-slate-300">
            Confirmar senha
          </label>
          <Input
            v-model="form.confirmacao"
            type="password"
            autocomplete="new-password"
            placeholder="Repita a nova senha"
            :disabled="isBusy"
          />
        </div>

        <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Por seguranca, a senha atual nunca e exibida. Voce pode apenas criar uma nova.
        </p>

        <Botao
          type="submit"
          class="w-full"
          :disabled="!canSubmit || isBusy"
        >
          {{ status === 'saving' ? 'Salvando...' : 'Salvar nova senha' }}
        </Botao>
      </form>

      <div v-else class="space-y-3">
        <Botao
          v-if="status === 'success'"
          type="button"
          class="w-full"
          @click="voltarLogin"
        >
          Ir para o login
        </Botao>

        <Botao
          v-if="status === 'error'"
          type="button"
          variant="secondary"
          class="w-full"
          @click="voltarLogin"
        >
          Solicitar novo link
        </Botao>
      </div>
    </Card>
  </LayoutAuthPageShell>
</template>
