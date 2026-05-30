<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'neutral' | 'primary' | 'danger'
    size?: 'sm' | 'md'
    disabled?: boolean
    label: string
  }>(),
  {
    type: 'button',
    variant: 'neutral',
    size: 'md',
    disabled: false,
  },
)

const baseClass =
  'inline-flex shrink-0 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60'

const sizeClass = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
}

const variantClass = {
  neutral:
    'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  primary:
    'bg-brand-600 text-white hover:bg-brand-500 focus:ring-brand-500/30 dark:bg-brand-500 dark:hover:bg-brand-600',
  danger:
    'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus:ring-rose-500/20 dark:border-rose-900/70 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30',
}
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled"
    :aria-label="props.label"
    :title="props.label"
    :class="[baseClass, sizeClass[props.size], variantClass[props.variant]]"
  >
    <slot />
  </button>
</template>
