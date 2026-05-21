<script setup lang="ts">
defineProps<{
  loading?: boolean
}>()
</script>

<template>
  <div class="flex min-h-48 items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
    <div v-if="loading" class="space-y-2">
      <div class="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <p class="text-sm text-slate-500 dark:text-slate-400">
        Carregando historico...
      </p>
    </div>

    <div v-else class="space-y-1">
      <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Nenhuma retirada registrada.
      </p>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        As entregas confirmadas aparecem aqui.
      </p>
    </div>
  </div>
</template>
