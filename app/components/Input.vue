<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string
    type?: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
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

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="relative">
    <input
      v-bind="attrs"
      :value="props.modelValue"
      :type="inputType"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      class="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
      :class="isPasswordField ? 'pr-10' : ''"
      @input="onInput"
    >

    <button
      v-if="isPasswordField"
      type="button"
      class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
      :aria-label="exibirSenha ? 'Ocultar senha' : 'Mostrar senha'"
      @click="exibirSenha = !exibirSenha"
    >
      <svg
        v-if="!exibirSenha"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
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
        stroke-width="1.8"
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
