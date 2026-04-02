<script setup lang="ts">
import { watch } from 'vue'
import { navigateTo } from '#app'
import { useSupabaseUser, useSupabaseCookieRedirect } from '#imports'

const user = useSupabaseUser()
const redirectInfo = useSupabaseCookieRedirect()

watch(user, () => {
  if (user.value) {
    // Pluck gets the original path from the cookie and removes it
    const path = redirectInfo.pluck()
    navigateTo(path || '/')
  }
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div class="flex flex-col items-center gap-4">
      <div class="h-12 w-12 border-4 border-slate-200 dark:border-slate-800 border-t-yellow-400 rounded-full animate-spin" />
      <p class="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
        Confirmando sua conta...
      </p>
    </div>
  </div>
</template>
