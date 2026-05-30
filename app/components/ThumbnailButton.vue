<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src: string
    alt?: string
    label?: string
  }>(),
  {
    alt: 'Imagem',
    label: 'Abrir imagem',
  },
)
</script>

<template>
  <button
    type="button"
    class="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-950"
    :aria-label="props.label"
    :title="props.label"
  >
    <img :src="props.src" :alt="props.alt" class="h-full w-full object-cover">
  </button>
</template>
