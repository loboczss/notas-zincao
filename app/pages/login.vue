<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthPageShell from '../components/layout/AuthPageShell.vue'
import DarkModeToggle from '../components/DarkModeToggle.vue'
import LoginTabs from '../components/login/LoginTabs.vue'
import LoginForm from '../components/login/LoginForm.vue'
import RegisterForm from '../components/login/RegisterForm.vue'
import { useAuthStore } from '../stores'

const authStore = useAuthStore()
const router = useRouter()

const abaAtiva = ref<'login' | 'cadastro'>('login')
const feedback = ref('')
const feedbackTipo = ref<'success' | 'error'>('success')

const loading = computed(() => authStore.loading)
const mensagemErro = computed(() => authStore.errorMessage)

onMounted(async () => {
  await authStore.fetchSession()
  if (authStore.isAuthenticated) {
    await router.push('/')
  }
})

const limparMensagens = () => {
  feedback.value = ''
  authStore.clearError()
}

const handleLogin = async (payload: { email: string; password: string }) => {
  limparMensagens()

  const ok = await authStore.signIn(payload)

  if (ok) {
    await router.push('/')
  }
}

const handleCadastro = async (payload: { nome: string; email: string; password: string }) => {
  limparMensagens()

  const ok = await authStore.signUp({
    ...payload,
    redirectTo: window.location.origin,
  })

  if (ok) {
    feedbackTipo.value = 'success'
    feedback.value = 'Conta criada com sucesso. Você já pode entrar.'
    abaAtiva.value = 'login'
  }
  else {
    feedbackTipo.value = 'error'
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
        <transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="transform -translate-y-2 opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="transform translate-y-0 opacity-100"
          leave-to-class="transform -translate-y-2 opacity-0"
        >
          <p
            v-if="feedback"
            class="rounded-2xl border px-4 py-3 text-sm font-medium backdrop-blur-sm"
            :class="feedbackTipo === 'success'
              ? 'border-emerald-200/50 bg-emerald-50/50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-red-200/50 bg-red-50/50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'"
          >
            {{ feedback }}
          </p>
        </transition>

        <transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="transform -translate-y-2 opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
        >
          <p
            v-if="mensagemErro"
            class="rounded-2xl border border-red-200/50 bg-red-50/50 px-4 py-3 text-sm font-medium text-red-700 backdrop-blur-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          >
            {{ mensagemErro }}
          </p>
        </transition>

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
