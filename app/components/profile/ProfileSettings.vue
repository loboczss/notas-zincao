<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Lock, Check } from 'lucide-vue-next'
import { useSupabaseClient } from '#imports'

const supabase = useSupabaseClient()

// ── Senha ─────────────────────────────────────────
const senhaForm = reactive({ nova: '', confirmacao: '' })
const senhaStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const senhaMensagem = ref('')

const salvarSenha = async () => {
  senhaMensagem.value = ''
  if (senhaForm.nova.length < 6) {
    senhaStatus.value = 'error'
    senhaMensagem.value = 'A senha deve ter pelo menos 6 caracteres.'
    return
  }
  if (senhaForm.nova !== senhaForm.confirmacao) {
    senhaStatus.value = 'error'
    senhaMensagem.value = 'As senhas não conferem.'
    return
  }
  senhaStatus.value = 'loading'
  const { error } = await supabase.auth.updateUser({ password: senhaForm.nova })
  if (error) {
    senhaStatus.value = 'error'
    senhaMensagem.value = error.message
  }
  else {
    senhaStatus.value = 'success'
    senhaMensagem.value = 'Senha alterada com sucesso.'
    senhaForm.nova = ''
    senhaForm.confirmacao = ''
  }
}
</script>

<template>
  <div class="grid grid-cols-1 gap-6">

    <!-- Alterar Senha -->
    <div class="relative overflow-hidden rounded-3xl">
      <div class="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-3xl" />
      <div class="relative p-6">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
            <Lock class="w-4 h-4" />
          </div>
          <h2 class="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Senha</h2>
        </div>

        <form class="grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="salvarSenha">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Nova senha
            </label>
            <input
              v-model="senhaForm.nova"
              type="password"
              autocomplete="new-password"
              placeholder="Mínimo 6 caracteres"
              class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Confirmar senha
            </label>
            <input
              v-model="senhaForm.confirmacao"
              type="password"
              autocomplete="new-password"
              placeholder="Repita a nova senha"
              class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          <div class="sm:col-span-2 flex flex-col gap-3">
            <p
              v-if="senhaMensagem"
              class="text-xs font-medium px-1"
              :class="senhaStatus === 'success' ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'"
            >
              {{ senhaMensagem }}
            </p>

            <button
              type="submit"
              :disabled="!senhaForm.nova || !senhaForm.confirmacao || senhaStatus === 'loading'"
              class="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none w-fit"
            >
              <Check class="w-4 h-4" />
              {{ senhaStatus === 'loading' ? 'Salvando...' : 'Alterar senha' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
