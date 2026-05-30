<script setup lang="ts">
import { onMounted } from 'vue'
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
  <LayoutAppPageShell
    eyebrow=""
    title="Perfil"
    description="Gerencie seus dados de acesso e preferencias."
  >
    <div class="space-y-4">
      <ProfileHeader />
      <ProfileSettings />
    </div>
  </LayoutAppPageShell>
</template>
