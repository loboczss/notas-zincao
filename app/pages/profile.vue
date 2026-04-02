<script setup lang="ts">
import { onMounted } from 'vue'
import ProfileHeader from '../components/profile/ProfileHeader.vue'
import ProfileInfo from '../components/profile/ProfileInfo.vue'
import ProfileSettings from '../components/profile/ProfileSettings.vue'
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
  <div class="min-h-screen pt-10 pb-20 px-4 sm:px-6">
    <div class="max-w-6xl mx-auto space-y-8">
      <!-- Profile Header -->
      <section class="animate-fade-in-up" style="animation-delay: 0ms;">
        <ProfileHeader />
      </section>

      <!-- Stats Grid -->
      <section class="animate-fade-in-up" style="animation-delay: 100ms;">
        <h2 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">
          Visão Geral
        </h2>
        <ProfileInfo />
      </section>

      <!-- Settings Section -->
      <section class="animate-fade-in-up" style="animation-delay: 200ms;">
        <h2 class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">
          Configurações da Conta
        </h2>
        <ProfileSettings />
      </section>

      <!-- Footer Info -->
      <footer class="pt-10 flex flex-col items-center gap-2">
        <div class="w-10 h-0.5 bg-slate-200 dark:bg-white/10 rounded-full" />
        <p class="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest text-center">
          Notas Zincão
        </p>
      </footer>
    </div>
  </div>
</template>

