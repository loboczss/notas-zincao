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
    return 'border-brand-500/20 bg-brand-500/10 text-brand-600 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-400 shadow-[0_0_12px_-4px_rgba(245,158,11,0.2)]'
  }

  if (props.status === 'parcial') {
    return 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-400 shadow-[0_0_12px_-4px_rgba(59,130,246,0.2)]'
  }

  if (props.status === 'retirada') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400 shadow-[0_0_12px_-4px_rgba(16,185,129,0.2)]'
  }

  return 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-400 shadow-[0_0_12px_-4px_rgba(244,63,94,0.2)]'
})
</script>

<template>
  <span
    class="glass-sm inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
    :class="badgeClass"
  >
    <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
    {{ label }}
  </span>
</template>
