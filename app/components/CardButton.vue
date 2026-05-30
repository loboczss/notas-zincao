<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'neutral' | 'warning'
    disabled?: boolean
  }>(),
  {
    type: 'button',
    variant: 'neutral',
    disabled: false,
  },
)

const baseClass =
  'w-full rounded-lg border text-left transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60'

const variantClass = {
  neutral:
    'border-slate-200 bg-white text-slate-800 hover:border-brand-300 hover:bg-slate-50 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-brand-700 dark:hover:bg-slate-950',
  warning:
    'border-amber-200 bg-white text-amber-950 hover:border-amber-400 hover:bg-amber-50 focus:ring-amber-500/20 dark:border-amber-900/60 dark:bg-slate-950 dark:text-amber-100 dark:hover:border-amber-500 dark:hover:bg-amber-950/40',
}
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled"
    :class="[baseClass, variantClass[props.variant]]"
  >
    <slot />
  </button>
</template>
