<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    disabled?: boolean
  }>(),
  {
    modelValue: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>

<template>
  <label class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
    <input
      :checked="props.modelValue"
      :disabled="props.disabled"
      type="checkbox"
      class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >
    <span>
      <slot />
    </span>
  </label>
</template>
