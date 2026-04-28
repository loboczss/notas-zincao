<script setup lang="ts">
const props = withDefaults(defineProps<{
  paddingClass?: string
}>(), {
  paddingClass: 'p-4'
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors duration-300">
    <!-- Header -->
    <div v-if="$slots.header" class="border-b border-slate-100 dark:border-slate-800/50 px-4 py-3">
      <slot name="header" />
    </div>

    <!-- Content -->
    <div :class="props.paddingClass">
      <slot />
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="border-t border-slate-100 dark:border-slate-800/50 px-4 py-3 bg-slate-50/50 dark:bg-slate-950/20 rounded-b-xl">
      <slot name="footer" />
    </div>
  </div>
</template>
