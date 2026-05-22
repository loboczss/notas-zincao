<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Lock, Check } from 'lucide-vue-next'
import { useSupabaseClient } from '#imports'
import { useToast } from '../../composables/useToast'
import { getApiErrorMessage } from '../../utils/api-errors'

const supabase = useSupabaseClient()
const { success: showSuccess, error: showError } = useToast()

const senhaForm = reactive({ nova: '', confirmacao: '' })
const senhaStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')

const salvarSenha = async () => {
  if (senhaForm.nova.length < 6) {
    senhaStatus.value = 'error'
    showError('A senha deve ter pelo menos 6 caracteres.')
    return
  }

  if (senhaForm.nova !== senhaForm.confirmacao) {
    senhaStatus.value = 'error'
    showError('As senhas nao conferem.')
    return
  }

  senhaStatus.value = 'loading'

  try {
    const { error } = await supabase.auth.updateUser({ password: senhaForm.nova })

    if (error) {
      throw error
    }

    senhaStatus.value = 'success'
    showSuccess('Senha alterada com sucesso.')
    senhaForm.nova = ''
    senhaForm.confirmacao = ''
  }
  catch (error) {
    senhaStatus.value = 'error'
    showError(getApiErrorMessage(error, 'Erro ao alterar senha.'))
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-6">
    <div class="relative overflow-hidden rounded-3xl">
      <div class="absolute inset-0 rounded-3xl border border-white/20 bg-white/40 backdrop-blur-2xl dark:border-white/5 dark:bg-slate-900/40" />
      <div class="relative p-6">
        <div class="mb-6 flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
            <Lock class="h-4 w-4" />
          </div>
          <h2 class="text-lg font-black text-slate-900 dark:text-white">Senha</h2>
        </div>

        <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="salvarSenha">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Nova senha
            </label>
            <input
              v-model="senhaForm.nova"
              type="password"
              autocomplete="new-password"
              placeholder="Minimo 6 caracteres"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Confirmar senha
            </label>
            <input
              v-model="senhaForm.confirmacao"
              type="password"
              autocomplete="new-password"
              placeholder="Repita a nova senha"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
            />
          </div>

          <div class="flex flex-col gap-3 sm:col-span-2">
            <button
              type="submit"
              :disabled="!senhaForm.nova || !senhaForm.confirmacao || senhaStatus === 'loading'"
              class="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-slate-900"
            >
              <Check class="h-4 w-4" />
              {{ senhaStatus === 'loading' ? 'Salvando...' : 'Alterar senha' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
