<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue?: string
    required?: boolean
    prominent?: boolean
    showSourceOptions?: boolean
  }>(),
  {
    modelValue: '',
    required: false,
    prominent: false,
    showSourceOptions: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'invalid-file'): void
}>()

const galleryInputRef = ref<HTMLInputElement | null>(null)
const cameraInputRef = ref<HTMLInputElement | null>(null)

const readFileAsDataUrl = async (file?: File | null) => {
  if (!file) {
    emit('update:modelValue', '')
    return
  }

  if (!file.type.startsWith('image/')) {
    emit('invalid-file')
    emit('update:modelValue', '')
    return
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'))
    reader.readAsDataURL(file)
  })

  emit('update:modelValue', dataUrl)
}

const onFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  await readFileAsDataUrl(file)
}

const openGallery = () => {
  galleryInputRef.value?.click()
}

const openCamera = () => {
  cameraInputRef.value?.click()
}
</script>

<template>
  <div class="space-y-2">
    <label :for="props.id" class="block text-xs font-semibold uppercase tracking-wider text-slate-500">
      {{ props.label }}<span v-if="props.required"> *</span>
    </label>

    <div
      class="flex min-h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center text-slate-500 transition md:min-h-36"
      :class="props.prominent
        ? 'border-blue-200 bg-blue-50/50 text-blue-700 hover:border-blue-300 hover:bg-blue-50'
        : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
        <path d="M7 16a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18 10.5V11a3.5 3.5 0 1 1 0 7H7Z" />
        <path d="M12 10v7m0-7-2.5 2.5M12 10l2.5 2.5" />
      </svg>
      <button type="button" class="mt-2 text-xs font-medium underline-offset-2 hover:underline" @click="openGallery">
        Clique para upload
      </button>

      <div v-if="props.showSourceOptions" class="mt-3 flex w-full flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          @click="openCamera"
        >
          Tirar foto
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          @click="openGallery"
        >
          Selecionar da galeria
        </button>
      </div>
    </div>

    <input
      ref="galleryInputRef"
      :id="props.id"
      class="hidden"
      type="file"
      accept="image/*"
      @change="onFileChange"
    >

    <input
      ref="cameraInputRef"
      class="hidden"
      type="file"
      accept="image/*"
      capture="environment"
      @change="onFileChange"
    >

    <div v-if="props.modelValue" class="rounded-lg border border-slate-200 bg-white p-2">
      <img :src="props.modelValue" :alt="props.label" class="max-h-40 w-full rounded object-contain">
    </div>

    <slot name="extra" />
  </div>
</template>
