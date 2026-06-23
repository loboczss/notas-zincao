<script setup lang="ts">
// Superfície base do design system de Previsão de Compras.
// Uma única receita de cartão: borda fina, fundo branco/escuro, cantos arredondados.
withDefaults(defineProps<{
  padding?: 'none' | 'sm' | 'md'
  as?: string
}>(), {
  padding: 'md',
  as: 'div',
})

const padMap: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-3.5',
}
</script>

<template>
  <component
    :is="as"
    class="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/40"
    :class="padMap[padding]"
  >
    <slot />
  </component>
</template>
