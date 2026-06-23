<script setup lang="ts">
import type { Component } from 'vue'

// Cabeçalho de seção compacto: ícone + título + subtítulo opcional + slot de ações à direita.
defineProps<{
  title: string
  subtitle?: string
  icon?: Component
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="min-w-0">
      <p class="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
        <component :is="icon" v-if="icon" class="h-4 w-4 text-brand-500" />
        {{ title }}
      </p>
      <p v-if="subtitle" class="text-[11px] text-slate-400 dark:text-slate-500">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
