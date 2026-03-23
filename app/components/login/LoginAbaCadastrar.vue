<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '../../stores/auth'
import Botao from '../Botao.vue'
import Input from '../Input.vue'

const email = ref('')
const nome = ref('')
const novaSenha = ref('')
const confirmarSenha = ref('')
const aceitouPolitica = ref(false)
const erro = ref('')
const sucesso = ref('')
const carregando = ref(false)

const authStore = useAuthStore()

const handleSubmit = async () => {
  erro.value = ''
  sucesso.value = ''

  if (!email.value || !nome.value || !novaSenha.value || !confirmarSenha.value) {
    erro.value = 'Preencha todos os campos para continuar.'
    return
  }

  if (novaSenha.value !== confirmarSenha.value) {
    erro.value = 'A confirmação de senha precisa ser igual à senha.'
    return
  }

  if (!aceitouPolitica.value) {
    erro.value = 'Você precisa aceitar a política de privacidade.'
    return
  }

  carregando.value = true

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/confirm`
    : undefined

  const sucessoCadastro = await authStore.signUp({
    email: email.value.trim(),
    password: novaSenha.value,
    nome: nome.value.trim(),
    redirectTo: redirectUrl,
  })

  carregando.value = false

  if (!sucessoCadastro) {
    if (authStore.errorMessage.includes('Database error saving new user')) {
      erro.value = 'Erro no Supabase ao salvar novo usuário. Verifique trigger/tabela de perfil no banco (Auth > Logs).'
    }
    else {
      erro.value = authStore.errorMessage || 'Não foi possível cadastrar.'
    }
    return
  }

  await authStore.fetchSession()

  if (authStore.session) {
    await navigateTo('/')
    return
  }

  sucesso.value = 'Cadastro realizado. Confira seu email para confirmar a conta.'
  await navigateTo('/confirm')
}
</script>

<template>
  <form id="login-cadastrar-form" class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-1">
      <label for="login-cadastrar-email" class="text-sm font-medium text-slate-700">Email</label>
      <Input id="login-cadastrar-email" v-model="email" type="email" placeholder="Digite seu email" />
    </div>

    <div class="space-y-1">
      <label for="login-cadastrar-nome" class="text-sm font-medium text-slate-700">Nome</label>
      <Input id="login-cadastrar-nome" v-model="nome" type="text" placeholder="Digite seu nome" />
    </div>

    <div class="space-y-1">
      <label for="login-cadastrar-senha" class="text-sm font-medium text-slate-700">Senha</label>
      <Input id="login-cadastrar-senha" v-model="novaSenha" type="password" placeholder="Digite a nova senha" />
    </div>

    <div class="space-y-1">
      <label for="login-cadastrar-confirmar-senha" class="text-sm font-medium text-slate-700">Confirmação de senha</label>
      <Input
        id="login-cadastrar-confirmar-senha"
        v-model="confirmarSenha"
        type="password"
        placeholder="Confirme a senha"
      />
    </div>

    <div class="flex items-start gap-2">
      <input
        id="aceite-politica"
        v-model="aceitouPolitica"
        type="checkbox"
        class="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      >
      <label for="aceite-politica" class="text-sm text-slate-700">
        Li e aceito a
        <NuxtLink to="/politica" class="font-medium text-blue-600 hover:text-blue-700">
          política de privacidade
        </NuxtLink>
      </label>
    </div>

    <p v-if="erro" class="text-sm font-medium text-red-600">
      {{ erro }}
    </p>

    <p v-if="sucesso" class="text-sm font-medium text-emerald-600">
      {{ sucesso }}
    </p>

    <Botao type="submit" variant="primary" class="w-full" :disabled="carregando">
      {{ carregando ? 'Cadastrando...' : 'Cadastrar' }}
    </Botao>
  </form>
</template>
