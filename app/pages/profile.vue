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
    eyebrow=""
    title="Perfil"
    width-class="max-w-2xl"
  >
    <div class="space-y-4">
      <ProfileHeader />
      <ProfileSettings />
    </div>
  </AppPageShell>
</template>
