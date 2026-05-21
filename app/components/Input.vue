<script lang="ts">
export default {
  name: 'Input',
  inheritAttrs: false
}
</script>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    type?: string
    placeholder?: string
    size?: 'sm' | 'md'
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
    size: 'md',
    disabled: false,
  },
)

const attrs = useAttrs()
const exibirSenha = ref(false)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isPasswordField = computed(() => props.type === 'password')
const inputType = computed(() => {
  if (!isPasswordField.value) {
    return props.type
  }

  return exibirSenha.value ? 'text' : 'password'
})

const passThroughAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const baseClass =
  'w-full rounded-lg border border-slate-200 bg-white text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/20'

const sizeClass = computed(() => {
  return props.size === 'sm'
    ? 'px-2.5 py-1.5 text-sm'
    : 'px-3 py-2 text-sm'
})

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="relative group">
    <input
      v-bind="passThroughAttrs"
      :value="props.modelValue"
      :type="inputType"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :class="[baseClass, sizeClass, attrs.class, isPasswordField ? 'pr-12' : '']"
      @input="onInput"
    >

    <button
      v-if="isPasswordField"
      type="button"
      class="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition-colors hover:text-brand-500 dark:hover:text-brand-400"
      :aria-label="exibirSenha ? 'Ocultar senha' : 'Mostrar senha'"
      @click="exibirSenha = !exibirSenha"
    >
      <svg
        v-if="!exibirSenha"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="h-5 w-5"
      >
        <path d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="h-5 w-5"
      >
        <path d="M3 3l18 18" />
        <path d="M10.58 10.58A2 2 0 0 0 12 16a2 2 0 0 0 1.42-.58" />
        <path d="M9.88 5.07A9.88 9.88 0 0 1 12 4.5c6 0 9.75 7.5 9.75 7.5a15.8 15.8 0 0 1-4.04 5.08" />
        <path d="M6.24 6.24A15.4 15.4 0 0 0 2.25 12s3.75 7.5 9.75 7.5a9.9 9.9 0 0 0 5.07-1.39" />
      </svg>
    </button>
  </div>
</template>
