<script lang="ts">
export default {
  name: 'LoginForm'
}
</script>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Botao from '../Botao.vue'
import Input from '../Input.vue'
import { useAuthStore } from '../../stores'

const props = withDefaults(defineProps<{
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'submit', value: { email: string; password: string }): void
}>()

const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: '',
})

const modoRecuperacao = ref(false)
const loadingRecuperacao = ref(false)
const feedbackRecuperacao = ref('')
const feedbackTipo = ref<'success' | 'error'>('success')

const onSubmit = () => {
  emit('submit', {
    email: form.email.trim(),
    password: form.password,
  })
}

const onSolicitarReset = async () => {
  if (!form.email.trim()) return

  loadingRecuperacao.value = true
  feedbackRecuperacao.value = ''

  const ok = await authStore.resetPassword(form.email.trim())
  
  if (ok) {
    feedbackTipo.value = 'success'
    feedbackRecuperacao.value = 'Um link de recuperação foi enviado para o seu email!'
  } else {
    feedbackTipo.value = 'error'
    feedbackRecuperacao.value = authStore.errorMessage || 'Ocorreu um erro ao solicitar recuperação.'
  }
  loadingRecuperacao.value = false
}
</script>

<template>
  <div>
    <!-- Modo Login Normal -->
    <form v-if="!modoRecuperacao" class="space-y-4" @submit.prevent="onSubmit">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
        </label>
        <Input v-model="form.email" type="email" autocomplete="email" placeholder="seu@email.com" required />
      </div>

      <div class="space-y-1.5">
        <div class="flex justify-between items-center">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
            Senha
          </label>
          <button 
            type="button"
            class="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            @click="modoRecuperacao = true"
          >
            Esqueci minha senha
          </button>
        </div>
        <Input v-model="form.password" type="password" autocomplete="current-password" placeholder="Sua senha" required />
      </div>

      <Botao type="submit" :disabled="props.loading" class="w-full">
        {{ props.loading ? 'Entrando...' : 'Entrar' }}
      </Botao>
    </form>

    <!-- Modo Recuperação de Senha -->
    <form v-else class="space-y-4" @submit.prevent="onSolicitarReset">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
          Recuperar Senha
        </label>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Insira o seu e-mail abaixo para receber o link de redefinição de senha.
        </p>
        <Input v-model="form.email" type="email" placeholder="seu@email.com" required />
      </div>

      <div v-if="feedbackRecuperacao" class="p-3 rounded-xl border text-xs font-medium"
        :class="feedbackTipo === 'success' 
          ? 'border-emerald-200/50 bg-emerald-50/50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' 
          : 'border-red-200/50 bg-red-50/50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'"
      >
        {{ feedbackRecuperacao }}
      </div>

      <div class="flex flex-col gap-2">
        <Botao type="submit" :disabled="loadingRecuperacao || !form.email" class="w-full">
          {{ loadingRecuperacao ? 'Enviando...' : 'Enviar Link de Recuperação' }}
        </Botao>
        <button 
          type="button"
          class="text-center text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-1 transition-colors"
          @click="modoRecuperacao = false; feedbackRecuperacao = ''"
        >
          Voltar ao login
        </button>
      </div>
    </form>
  </div>
</template>
