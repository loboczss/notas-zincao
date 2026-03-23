<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    required?: boolean
    error?: boolean
  }>(),
  {
    required: false,
    error: false,
  },
)
</script>

<template>
  <div class="space-y-2">
    <label class="block text-xs font-semibold uppercase tracking-wider" :class="props.error ? 'text-red-600' : 'text-slate-500'">
      {{ props.label }}<span v-if="props.required"> *</span>
    </label>
    <slot />
  </div>
</template>
