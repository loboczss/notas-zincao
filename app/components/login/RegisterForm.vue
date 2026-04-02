<script lang="ts">
export default {
  name: 'RegisterForm'
}
</script>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Botao from '../Botao.vue'
import Input from '../Input.vue'

const props = withDefaults(defineProps<{
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'submit', value: { nome: string; email: string; password: string }): void
}>()

const form = reactive({
  nome: '',
  email: '',
  password: '',
  confirmacaoSenha: '',
})

const erroLocal = ref('')

const onSubmit = () => {
  erroLocal.value = ''

  if (form.password !== form.confirmacaoSenha) {
    erroLocal.value = 'As senhas não conferem.'
    return
  }

  emit('submit', {
    nome: form.nome.trim(),
    email: form.email.trim(),
    password: form.password,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <div class="space-y-1.5">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
        Nome
      </label>
      <Input v-model="form.nome" type="text" autocomplete="name" placeholder="Seu nome" required />
    </div>

    <div class="space-y-1.5">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
        Email
      </label>
      <Input v-model="form.email" type="email" autocomplete="email" placeholder="seu@email.com" required />
    </div>

    <div class="space-y-1.5">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
        Senha
      </label>
      <Input v-model="form.password" type="password" autocomplete="new-password" placeholder="Crie uma senha" required />
    </div>

    <div class="space-y-1.5">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
        Confirmar senha
      </label>
      <Input
        v-model="form.confirmacaoSenha"
        type="password"
        autocomplete="new-password"
        placeholder="Repita a senha"
        required
      />
    </div>

    <p v-if="erroLocal" class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      {{ erroLocal }}
    </p>

    <Botao type="submit" :disabled="props.loading" class="w-full">
      {{ props.loading ? 'Criando conta...' : 'Criar conta' }}
    </Botao>
  </form>
</template>
