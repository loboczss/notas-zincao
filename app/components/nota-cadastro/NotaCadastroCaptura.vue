<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { Camera as CameraIcon, Images, LoaderCircle, SearchCheck, X } from 'lucide-vue-next'
import { ref } from 'vue'
import Botao from '../Botao.vue'
import NotaCadastroSection from './NotaCadastroSection.vue'
import { CADASTRO_NOTA_CAMERA_PENDING_KEY } from '../../constants/camera-capture'
import { NOTA_IMAGE_MAX_DIMENSION } from '../../utils/image-compression'

const props = withDefaults(defineProps<{
  previewUrl?: string
  lookupLoading?: boolean
}>(), {
  previewUrl: '',
  lookupLoading: false,
})

const emit = defineEmits<{
  (e: 'selectImage', event: Event): void
  (e: 'selectImageDataUrl', dataUrl: string): void
  (e: 'lookupFromImage'): void
}>()

const cameraInput = ref<HTMLInputElement | null>(null)
const galleryInput = ref<HTMLInputElement | null>(null)
const pickerOpen = ref(false)
const nativeCaptureLoading = ref(false)

const openPicker = () => {
  pickerOpen.value = true
}

const closePicker = () => {
  pickerOpen.value = false
}

const isNativeCameraCanceled = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '')
  return /cancel|cancelled|canceled|user cancelled/i.test(message)
}

const dataUrlFromPhoto = (photo: { dataUrl?: string; base64String?: string; format?: string }) => {
  if (photo.dataUrl) return photo.dataUrl
  if (photo.base64String) {
    const format = photo.format || 'jpeg'
    return `data:image/${format};base64,${photo.base64String}`
  }

  return ''
}

const requestNativeImage = async (source: 'camera' | 'photos') => {
  if (!import.meta.client || !Capacitor.isNativePlatform()) return false

  nativeCaptureLoading.value = true
  localStorage.setItem(CADASTRO_NOTA_CAMERA_PENDING_KEY, source)

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await Camera.getPhoto({
      allowEditing: false,
      correctOrientation: true,
      height: NOTA_IMAGE_MAX_DIMENSION,
      quality: 72,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      width: NOTA_IMAGE_MAX_DIMENSION,
    })
    const dataUrl = dataUrlFromPhoto(photo)

    if (dataUrl) {
      emit('selectImageDataUrl', dataUrl)
    }

    return true
  }
  catch (error) {
    if (isNativeCameraCanceled(error)) return true
    console.warn('[nota-cadastro] native camera unavailable, falling back to file input', error)
    return false
  }
  finally {
    localStorage.removeItem(CADASTRO_NOTA_CAMERA_PENDING_KEY)
    nativeCaptureLoading.value = false
  }
}

const triggerCamera = async () => {
  closePicker()
  if (await requestNativeImage('camera')) return
  cameraInput.value?.click()
}

const triggerGallery = async () => {
  closePicker()
  if (await requestNativeImage('photos')) return
  galleryInput.value?.click()
}

const onImageSelected = (event: Event) => {
  closePicker()
  emit('selectImage', event)
}
</script>

<template>
  <NotaCadastroSection eyebrow="Captura" title="Cupom fiscal">
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onImageSelected"
    >
    <input
      ref="galleryInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onImageSelected"
    >

    <!-- State A: No Image Uploaded -->
    <div v-if="!props.previewUrl" class="w-full">
      <button
        type="button"
        class="group flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-brand-500 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-brand-500/80 dark:hover:bg-slate-900/60"
        @click="openPicker"
      >
        <CameraIcon class="h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors group-hover:text-brand-500 dark:group-hover:text-brand-400" />
        <span>Adicionar imagem</span>
      </button>
      <p class="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        JPG, PNG ou WEBP
      </p>
    </div>

    <!-- State B: Image is Uploaded -->
    <div v-else class="flex items-center gap-3">
      <div class="flex-1 flex flex-col gap-2 min-w-0">
        <Botao
          type="button"
          size="sm"
          variant="primary"
          class="h-9 w-full"
          :disabled="props.lookupLoading"
          @click="emit('lookupFromImage')"
        >
          <LoaderCircle v-if="props.lookupLoading" class="h-4 w-4 animate-spin" />
          <SearchCheck v-else class="h-4 w-4" />
          {{ props.lookupLoading ? 'Buscando...' : 'Buscar pela foto' }}
        </Botao>

        <button
          type="button"
          class="group flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-brand-500 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-brand-500/80 dark:hover:bg-slate-900/60"
          @click="openPicker"
        >
          <CameraIcon class="h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors group-hover:text-brand-500 dark:group-hover:text-brand-400" />
          <span>Trocar imagem</span>
        </button>
      </div>

      <!-- Preview Image Container (Visible only when previewUrl exists) -->
      <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
        <img :src="props.previewUrl" alt="Preview do cupom" class="h-full w-full object-cover">
      </div>
    </div>

    <div
      v-if="pickerOpen"
      class="mt-3 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-500 active:bg-brand-700"
          :disabled="nativeCaptureLoading"
          @click="triggerCamera"
        >
          <LoaderCircle v-if="nativeCaptureLoading" class="h-4 w-4 animate-spin" />
          <CameraIcon v-else class="h-4 w-4" />
          <span>Tirar foto</span>
        </button>
        <button
          type="button"
          class="flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition hover:border-brand-500 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500"
          :disabled="nativeCaptureLoading"
          @click="triggerGallery"
        >
          <Images class="h-4 w-4" />
          <span>Galeria</span>
        </button>
      </div>
      <button
        type="button"
        class="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
        @click="closePicker"
      >
        <X class="h-3.5 w-3.5" />
        <span>Cancelar</span>
      </button>
    </div>
  </NotaCadastroSection>
</template>
