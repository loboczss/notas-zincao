<script lang="ts">
export default {
  name: 'LoginForm'
}
</script>

<script setup lang="ts">
import { reactive } from 'vue'
import Botao from '../Botao.vue'
import Input from '../Input.vue'

const props = withDefaults(defineProps<{
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'submit', value: { email: string; password: string }): void
}>()

const form = reactive({
  email: '',
  password: '',
})

const onSubmit = () => {
  emit('submit', {
    email: form.email.trim(),
    password: form.password,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
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
      <Input v-model="form.password" type="password" autocomplete="current-password" placeholder="Sua senha" required />
    </div>

    <Botao type="submit" :disabled="props.loading" class="w-full">
      {{ props.loading ? 'Entrando...' : 'Entrar' }}
    </Botao>
  </form>
</template>
