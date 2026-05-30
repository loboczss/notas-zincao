<script setup lang="ts">
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  readonlyMode?: boolean
  errorMessage?: string
  successMessage?: string
}>(), {
  readonlyMode: false,
  errorMessage: '',
  successMessage: '',
})
</script>

<template>
  <div v-if="props.readonlyMode || props.errorMessage || props.successMessage" class="space-y-2">
    <div
      v-if="props.readonlyMode"
      class="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
    >
      <ShieldAlert class="mt-0.5 h-4 w-4 shrink-0" />
      <p>Seu perfil esta em modo somente leitura nesta tela.</p>
    </div>

    <div
      v-if="props.errorMessage"
      class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300"
    >
      <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
      <p>{{ props.errorMessage }}</p>
    </div>

    <div
      v-if="props.successMessage"
      class="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300"
    >
      <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0" />
      <p>{{ props.successMessage }}</p>
    </div>
  </div>
</template>
