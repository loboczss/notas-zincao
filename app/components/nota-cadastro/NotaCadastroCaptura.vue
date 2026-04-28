<script setup lang="ts">
import { Camera, LoaderCircle, Sparkles } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  previewUrl?: string
  loading?: boolean
}>(), {
  previewUrl: '',
  loading: false,
})

const emit = defineEmits<{
  (e: 'selectImage', event: Event): void
  (e: 'analyze'): void
}>()
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Captura
        </p>
        <h2 class="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
          Foto do cupom fiscal
        </h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Anexe a foto e deixe a IA preencher a maior parte do cadastro.
        </p>
      </div>

      <div class="hidden rounded-xl bg-slate-100 p-2.5 text-slate-500 dark:bg-slate-800 dark:text-slate-300 md:block">
        <Camera class="h-5 w-5" />
      </div>
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <label class="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-brand-500 dark:hover:bg-slate-900">
        <input type="file" accept="image/*" class="hidden" @change="emit('selectImage', $event)">
        <Camera class="h-6 w-6 text-slate-400 dark:text-slate-500" />
        <p class="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Câmera ou galeria
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          JPG, PNG, WEBP ou HEIC
        </p>
      </label>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <div v-if="props.previewUrl" class="h-full min-h-48">
          <img :src="props.previewUrl" alt="Preview do cupom" class="h-full w-full object-cover">
        </div>
        <div v-else class="flex min-h-48 items-center justify-center px-4 text-center text-xs text-slate-500 dark:text-slate-400">
          O preview aparecerá aqui.
        </div>
      </div>
    </div>

    <div class="mt-4 flex justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
        :disabled="!props.previewUrl || props.loading"
        @click="emit('analyze')"
      >
        <LoaderCircle v-if="props.loading" class="h-4 w-4 animate-spin" />
        <Sparkles v-else class="h-4 w-4" />
        {{ props.loading ? 'Analisando...' : 'Analisar com IA' }}
      </button>
    </div>
  </section>
</template>
