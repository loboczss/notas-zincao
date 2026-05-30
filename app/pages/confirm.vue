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
  <LayoutAuthPageShell
    title="Confirmando conta"
    description="Estamos validando seu acesso."
  >
    <Card padding-class="p-6">
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500 dark:border-slate-800" />
        <p class="font-medium text-slate-500 animate-pulse dark:text-slate-400">
        Confirmando sua conta...
        </p>
      </div>
    </Card>
  </LayoutAuthPageShell>
</template>
