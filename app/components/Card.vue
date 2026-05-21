<script setup lang="ts">
const props = withDefaults(defineProps<{
  paddingClass?: string
}>(), {
  paddingClass: 'p-4'
})
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
    <!-- Header -->
    <div v-if="$slots.header" class="border-b border-slate-100 dark:border-slate-800/50 px-4 py-3">
      <slot name="header" />
    </div>

    <!-- Content -->
    <div :class="props.paddingClass">
      <slot />
    </div>

    <!-- Footer -->
    <div v-if="$slots.footer" class="rounded-b-lg border-t border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800/50 dark:bg-slate-950/20">
      <slot name="footer" />
    </div>
  </div>
</template>
