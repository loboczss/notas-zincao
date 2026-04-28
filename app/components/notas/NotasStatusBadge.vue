<script setup lang="ts">
import { computed } from 'vue'
import type { NotaRetiradaStatus } from '../../../shared/types/NotasRetirada'

const props = defineProps<{
  status: NotaRetiradaStatus
}>()

const label = computed(() => {
  if (props.status === 'pendente') return 'Pendente'
  if (props.status === 'parcial') return 'Parcial'
  if (props.status === 'retirada') return 'Retirada'
  return 'Cancelada'
})

const badgeClass = computed(() => {
  if (props.status === 'pendente') {
    return 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
  }

  if (props.status === 'parcial') {
    return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
  }

  if (props.status === 'retirada') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
  }

  return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors"
    :class="badgeClass"
  >
    <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {{ label }}
  </span>
</template>
