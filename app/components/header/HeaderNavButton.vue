<script lang="ts">
export default {
  name: 'HeaderNavButton'
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  active?: boolean
  danger?: boolean
  block?: boolean
}>(), {
  active: false,
  danger: false,
  block: false,
})

const buttonClass = computed(() => {
  if (props.danger) {
    return 'text-rose-600 hover:bg-rose-100/50 dark:text-rose-400 dark:hover:bg-rose-500/10 hover:shadow-sm'
  }

  if (props.active) {
    return 'bg-brand-600 text-white shadow-md shadow-brand-500/20 dark:bg-brand-500 dark:shadow-brand-500/10'
  }

  return 'text-slate-700 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:bg-slate-800/40 hover:shadow-sm'
})
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-slate-500/50"
    :class="[buttonClass, block ? 'w-full justify-start' : '']"
  >
    <slot />
  </button>
</template>
