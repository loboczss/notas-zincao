<script setup lang="ts">
type Option = {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    options?: Option[]
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    options: () => [],
    placeholder: 'Selecione uma opção',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <select
    :value="props.modelValue"
    :disabled="props.disabled"
    class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-slate-100"
    @change="onChange"
  >
    <option disabled value="">
      {{ props.placeholder }}
    </option>
    <option v-for="option in props.options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
