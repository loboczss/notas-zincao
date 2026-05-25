<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Check, Lock } from 'lucide-vue-next'
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
  <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
    <div class="mb-4 flex items-center gap-2">
      <Lock class="h-4 w-4 text-slate-500 dark:text-slate-400" />
      <h2 class="text-sm font-semibold text-slate-950 dark:text-slate-50">
        Senha
      </h2>
    </div>

    <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="salvarSenha">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-slate-600 dark:text-slate-300">
          Nova senha
        </label>
        <input
          v-model="senhaForm.nova"
          type="password"
          autocomplete="new-password"
          placeholder="Minimo 6 caracteres"
          class="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-600"
        >
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-medium text-slate-600 dark:text-slate-300">
          Confirmar senha
        </label>
        <input
          v-model="senhaForm.confirmacao"
          type="password"
          autocomplete="new-password"
          placeholder="Repita a nova senha"
          class="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-600"
        >
      </div>

      <div class="sm:col-span-2">
        <button
          type="submit"
          :disabled="!senhaForm.nova || !senhaForm.confirmacao || senhaStatus === 'loading'"
          class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 sm:w-auto"
        >
          <Check class="h-4 w-4" />
          {{ senhaStatus === 'loading' ? 'Salvando...' : 'Salvar senha' }}
        </button>
      </div>
    </form>
  </section>
</template>
