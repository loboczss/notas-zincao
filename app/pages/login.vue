<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthPageShell from '../components/layout/AuthPageShell.vue'
import DarkModeToggle from '../components/DarkModeToggle.vue'
import LoginTabs from '../components/login/LoginTabs.vue'
import LoginForm from '../components/login/LoginForm.vue'
import RegisterForm from '../components/login/RegisterForm.vue'
import { useAuthStore } from '../stores'
import { useToast } from '../composables/useToast'
import { AppRoute } from '../constants/routes'

const authStore = useAuthStore()
const router = useRouter()
const { success: showSuccess } = useToast()

const abaAtiva = ref<'login' | 'cadastro'>('login')
const loading = computed(() => authStore.loading)

onMounted(async () => {
  await authStore.fetchSession()
  if (authStore.isAuthenticated) {
    await router.push(AppRoute.home)
  }
})

const limparMensagens = () => {
  authStore.clearError()
}

const handleLogin = async (payload: { email: string; password: string }) => {
  limparMensagens()

  const ok = await authStore.signIn(payload)

  if (ok) {
    await router.push(AppRoute.home)
  }
}

const handleCadastro = async (payload: { nome: string; email: string; password: string }) => {
  limparMensagens()

  const ok = await authStore.signUp({
    ...payload,
    redirectTo: window.location.origin,
  })

  if (ok) {
    showSuccess('Conta criada com sucesso. Voce ja pode entrar.')
    abaAtiva.value = 'login'
  }
}
</script>

<template>
  <AuthPageShell
    title="Acessar conta"
    description="Entre no sistema ou crie seu cadastro."
    width-class="max-w-lg"
  >
    <div class="absolute top-8 right-8 z-20 animate-fade-in" style="animation-delay: 400ms;">
      <DarkModeToggle />
    </div>

    <div class="space-y-8">
      <div class="animate-fade-in-up" style="animation-delay: 100ms;">
        <LoginTabs v-model:active-tab="abaAtiva" />
      </div>

      <div class="space-y-6">
        <div class="animate-fade-in-up" style="animation-delay: 200ms;">
          <LoginForm
            v-if="abaAtiva === 'login'"
            :loading="loading"
            @submit="handleLogin"
          />

          <RegisterForm
            v-else
            :loading="loading"
            @submit="handleCadastro"
          />
        </div>
      </div>
    </div>
  </AuthPageShell>
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}
</style>
