<script lang="ts">
export default {
  name: 'Botao'
}
</script>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'danger' | 'accent'
    size?: 'sm' | 'md'
    disabled?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
)

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-lg text-center font-semibold transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50'

const sizeClass = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
}

const variantClass = {
  primary: 'bg-brand-600 text-white hover:bg-brand-500 focus:ring-brand-500/30 active:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600',
  accent:
    'bg-brand-500 text-slate-950 shadow-sm shadow-brand-500/25 hover:bg-brand-400 focus:ring-brand-500/40 active:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-300 dark:active:bg-brand-500',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500/20 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  danger:
    'text-rose-600 hover:bg-rose-50 focus:ring-rose-500/20 active:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/10',
}
</script>

<template>
  <button :type="props.type" :disabled="props.disabled" :class="[baseClass, sizeClass[props.size], variantClass[props.variant]]">
    <slot />
  </button>
</template>
