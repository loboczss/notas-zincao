<script lang="ts">
export default {
  name: 'Botao'
}
</script>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary'
    disabled?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    disabled: false,
  },
)

const baseClass =
  'inline-flex items-center justify-center rounded-2xl px-6 py-3 text-center text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50'

const variantClass = {
  primary: 'bg-amber-600 dark:bg-amber-500 text-white hover:bg-amber-700 dark:hover:bg-amber-600 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] dark:hover:shadow-[0_0_25px_rgba(99,102,241,0.3)] focus:ring-amber-500/20 active:scale-[0.98]',
  secondary:
    'border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 backdrop-blur-sm focus:ring-slate-500/10 active:scale-[0.98]',
}
</script>

<template>
  <button :type="props.type" :disabled="props.disabled" :class="[baseClass, variantClass[props.variant]]">
    <slot />
  </button>
</template>
