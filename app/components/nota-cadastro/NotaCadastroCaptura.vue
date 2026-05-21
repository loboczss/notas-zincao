<script setup lang="ts">
import { Camera, LoaderCircle, Sparkles } from 'lucide-vue-next'
import Botao from '../Botao.vue'
import NotaCadastroSection from './NotaCadastroSection.vue'

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
  <NotaCadastroSection eyebrow="Captura" title="Cupom fiscal">
    <!-- State A: No Image Uploaded -->
    <div v-if="!props.previewUrl" class="w-full">
      <label class="group flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-brand-500 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-brand-500/80 dark:hover:bg-slate-900/60">
        <input
          id="cupom-fiscal-file-input"
          type="file"
          accept="image/*"
          class="hidden"
          @change="emit('selectImage', $event)"
        >
        <Camera class="h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors group-hover:text-brand-500 dark:group-hover:text-brand-400" />
        <span>Adicionar imagem</span>
      </label>
      <p class="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        JPG, PNG ou WEBP
      </p>
    </div>

    <!-- State B: Image is Uploaded -->
    <div v-else class="flex items-center gap-3">
      <div class="flex-1 flex flex-col gap-2 min-w-0">
        <!-- IA Action Button -->
        <Botao
          type="button"
          size="sm"
          variant="primary"
          class="w-full shadow-sm"
          :disabled="props.loading"
          @click="emit('analyze')"
        >
          <LoaderCircle v-if="props.loading" class="h-4 w-4 animate-spin" />
          <Sparkles v-else class="h-4 w-4" />
          {{ props.loading ? 'Analisando...' : 'Analisar com IA' }}
        </Botao>

        <!-- Trocar Imagem Button -->
        <label class="group flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-brand-500 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-brand-500/80 dark:hover:bg-slate-900/60">
          <input
            id="cupom-fiscal-file-input-change"
            type="file"
            accept="image/*"
            class="hidden"
            @change="emit('selectImage', $event)"
          >
          <Camera class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-colors group-hover:text-brand-500 dark:group-hover:text-brand-400" />
          <span>Trocar imagem</span>
        </label>
      </div>

      <!-- Preview Image Container (Visible only when previewUrl exists) -->
      <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
        <img :src="props.previewUrl" alt="Preview do cupom" class="h-full w-full object-cover">
      </div>
    </div>
  </NotaCadastroSection>
</template>
