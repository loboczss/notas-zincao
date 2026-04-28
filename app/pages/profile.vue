<script setup lang="ts">
import { onMounted } from 'vue'
import ProfileHeader from '../components/profile/ProfileHeader.vue'
import ProfileSettings from '../components/profile/ProfileSettings.vue'
import AppPageShell from '../components/layout/AppPageShell.vue'
import { useAuthStore } from '../stores'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()

onMounted(async () => {
  await authStore.getMe()
})
</script>

<template>
  <AppPageShell
    eyebrow="Configurações"
    title="Meu Perfil"
    description="Gerencie suas informações pessoais, senhas e visualize suas estatísticas de atividade."
    width-class="max-w-5xl"
  >
    <div class="mt-6 space-y-8">
      <!-- Profile Header -->
      <section class="animate-fade-in">
        <ProfileHeader />
      </section>


      <!-- Settings Section -->
      <section class="animate-fade-in space-y-3">
        <h2 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
          Segurança
        </h2>
        <ProfileSettings />
      </section>
    </div>
  </AppPageShell>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

