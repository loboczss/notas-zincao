<script setup lang="ts">
import { Check, LoaderCircle } from 'lucide-vue-next'
import Botao from '../Botao.vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    loading?: boolean
    label?: string
    loadingLabel?: string
  }>(),
  {
    disabled: false,
    loading: false,
    label: 'Salvar nota',
    loadingLabel: 'Salvando...',
  },
)

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <div
    class="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-30 transition-all duration-500 transform"
    :class="[
      !props.disabled
        ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
        : 'translate-y-16 opacity-0 scale-90 pointer-events-none'
    ]"
  >
    <Botao
      id="nota-cadastro-botao-flutuante"
      type="button"
      :disabled="props.disabled"
      class="min-h-12 min-w-40 !rounded-full !px-6 !py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-400 dark:to-brand-500 !text-slate-950 font-bold hover:from-brand-600 hover:to-brand-700 dark:hover:from-brand-300 dark:hover:to-brand-400 active:scale-95 shadow-lg shadow-brand-500/30 dark:shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/40 dark:hover:shadow-brand-500/30 transition-all duration-300 flex items-center justify-center gap-2.5 outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:cursor-not-allowed border border-brand-400 dark:border-brand-300/30 cursor-pointer"
      @click="emit('click')"
    >
      <LoaderCircle v-if="props.loading" class="h-5 w-5 animate-spin" />
      <Check v-else class="h-5 w-5" />
      <span class="tracking-wide text-xs uppercase font-extrabold">
        {{ props.loading ? props.loadingLabel : props.label }}
      </span>
    </Botao>
  </div>
</template>
