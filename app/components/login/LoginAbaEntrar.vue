<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '../../stores/auth'
import Botao from '../Botao.vue'
import Input from '../Input.vue'

const login = ref('')
const senha = ref('')
const lembrarUsuario = ref(false)
const carregando = ref(false)
const erro = ref('')

const authStore = useAuthStore()

onMounted(() => {
  const loginSalvo = localStorage.getItem('login-lembrado')

  if (loginSalvo) {
    login.value = loginSalvo
    lembrarUsuario.value = true
  }
})

const handleSubmit = async () => {
  erro.value = ''

  if (!login.value || !senha.value) {
    erro.value = 'Informe login e senha para continuar.'
    return
  }

  carregando.value = true

  const sucesso = await authStore.signIn({
    email: login.value.trim(),
    password: senha.value,
  })

  carregando.value = false

  if (!sucesso) {
    erro.value = authStore.errorMessage || 'Não foi possível autenticar.'
    return
  }

  if (typeof window !== 'undefined') {
    if (lembrarUsuario.value) {
      localStorage.setItem('login-lembrado', login.value.trim())
    }
    else {
      localStorage.removeItem('login-lembrado')
    }
  }

  await navigateTo('/')
}
</script>

<template>
  <form id="login-entrar-form" class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-1">
      <label for="login-entrar-usuario" class="text-sm font-medium text-slate-700">Login</label>
      <Input id="login-entrar-usuario" v-model="login" type="email" placeholder="Digite seu email" />
    </div>

    <div class="space-y-1">
      <label for="login-entrar-senha" class="text-sm font-medium text-slate-700">Senha</label>
      <Input id="login-entrar-senha" v-model="senha" type="password" placeholder="Digite sua senha" />
    </div>

    <div class="flex items-center gap-2">
      <input
        id="lembrar-usuario"
        v-model="lembrarUsuario"
        type="checkbox"
        class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      >
      <label for="lembrar-usuario" class="text-sm text-slate-700">
        Lembrar usuário
      </label>
    </div>

    <p v-if="erro" class="text-sm font-medium text-red-600">
      {{ erro }}
    </p>

    <Botao type="submit" variant="primary" class="w-full" :disabled="carregando">
      {{ carregando ? 'Entrando...' : 'Entrar' }}
    </Botao>
  </form>
</template>
