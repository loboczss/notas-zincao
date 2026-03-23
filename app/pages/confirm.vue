<script setup lang="ts">
import { watch } from 'vue'
import { navigateTo, useSupabaseCookieRedirect, useSupabaseUser } from '#imports'
import Botao from '../components/Botao.vue'
import AuthPageShell from '../components/layout/AuthPageShell.vue'

const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()

watch(user, () => {
  if (user.value) {
    const path = redirectInfo.pluck()
    navigateTo(path || '/')
  }
}, { immediate: true })

const voltarParaLogin = async () => {
  await navigateTo('/login')
}
</script>

<template>
  <AuthPageShell
    title="Confirmação"
    description="Estamos confirmando seu acesso. Se necessário, finalize a confirmação pelo link enviado no email."
  >
    <div class="text-center">
      <div class="mt-6">
        <Botao type="button" variant="secondary" class="w-full sm:w-auto" @click="voltarParaLogin">
          Voltar para login
        </Botao>
      </div>
    </div>
  </AuthPageShell>
</template>
