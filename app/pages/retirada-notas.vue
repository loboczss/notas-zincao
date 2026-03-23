<script setup lang="ts">
import WithdrawalManager from '../components/Withdrawal/WithdrawalManager.vue'
import AppPageShell from '../components/layout/AppPageShell.vue'

definePageMeta({
  middleware: [
    () => {
      const session = useSupabaseSession()
      if (!session.value) return navigateTo('/login')
    }
  ],
})
</script>

<template>
  <AppPageShell 
    eyebrow="Operacional" 
    title="Gestão de Retiradas" 
    description="Fila de espera e conferência de mercadorias para entrega."
  >
    <div class="mt-8">
      <WithdrawalManager />
    </div>
  </AppPageShell>
</template>
