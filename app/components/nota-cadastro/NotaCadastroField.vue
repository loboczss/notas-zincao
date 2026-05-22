<script setup lang="ts">
const props = defineProps<{
  label: string
  error?: string
  help?: string
}>()
</script>

<template>
  <div :data-has-error="props.error ? 'true' : undefined">
    <label
      class="mb-1 block text-[11px] font-semibold"
      :class="props.error ? 'text-rose-600 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'"
    >
      {{ props.label }}
    </label>

    <slot />

    <p v-if="props.error" class="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
      {{ props.error }}
    </p>

    <p v-if="props.help || $slots.help" class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
      <span v-if="props.help">{{ props.help }}</span>
      <slot v-else name="help" />
    </p>
  </div>
</template>
