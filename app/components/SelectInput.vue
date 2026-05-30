<script lang="ts">
export default {
  name: 'SelectInput',
  inheritAttrs: false,
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    size?: 'sm' | 'md'
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    size: 'md',
    disabled: false,
  },
)

const attrs = useAttrs()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const passThroughAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const baseClass =
  'w-full rounded-lg border border-slate-200 bg-white text-slate-950 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400/20'

const sizeClass = computed(() => {
  return props.size === 'sm'
    ? 'px-2.5 py-1.5 text-sm'
    : 'px-3 py-2 text-sm'
})

const onChange = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <select
    v-bind="passThroughAttrs"
    :value="String(props.modelValue)"
    :disabled="props.disabled"
    :class="[baseClass, sizeClass, attrs.class]"
    @change="onChange"
  >
    <slot />
  </select>
</template>
