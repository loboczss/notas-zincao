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
import { useToast } from '../../composables/useToast'

const props = withDefaults(defineProps<{
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'submit', value: { email: string; password: string }): void
}>()

const authStore = useAuthStore()
const { success: showSuccess, error: showError } = useToast()

const form = reactive({
  email: '',
  password: '',
})

const modoRecuperacao = ref(false)
const loadingRecuperacao = ref(false)

const onSubmit = () => {
  emit('submit', {
    email: form.email.trim(),
    password: form.password,
  })
}

const onSolicitarReset = async () => {
  if (!form.email.trim()) return

  loadingRecuperacao.value = true

  const ok = await authStore.resetPassword(form.email.trim())

  if (ok) {
    showSuccess('Um link de recuperacao foi enviado para o seu email.')
  }
  else {
    showError(authStore.errorMessage || 'Ocorreu um erro ao solicitar recuperacao.')
  }

  loadingRecuperacao.value = false
}
</script>

<template>
  <div>
    <form v-if="!modoRecuperacao" class="space-y-4" @submit.prevent="onSubmit">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
        </label>
        <Input v-model="form.email" type="email" autocomplete="email" placeholder="seu@email.com" required />
      </div>

      <div class="space-y-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
            Senha
          </label>
          <button
            type="button"
            class="text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
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

    <form v-else class="space-y-4" @submit.prevent="onSolicitarReset">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
          Recuperar Senha
        </label>
        <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Insira o seu e-mail abaixo para receber o link de redefinicao de senha.
        </p>
        <Input v-model="form.email" type="email" placeholder="seu@email.com" required />
      </div>

      <div class="flex flex-col gap-2">
        <Botao type="submit" :disabled="loadingRecuperacao || !form.email" class="w-full">
          {{ loadingRecuperacao ? 'Enviando...' : 'Enviar link de recuperacao' }}
        </Botao>
        <button
          type="button"
          class="py-1 text-center text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          @click="modoRecuperacao = false"
        >
          Voltar ao login
        </button>
      </div>
    </form>
  </div>
</template>
