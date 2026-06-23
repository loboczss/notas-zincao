<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue'

// Barra de abas/sub-abas única e reutilizável do módulo.
// Substitui as várias implementações ad-hoc espalhadas pela feature.
defineProps<{
  modelValue: T
  tabs: Array<{ id: T, label: string, icon?: Component }>
  size?: 'sm' | 'md'
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: T): void }>()
</script>

<template>
  <div class="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xs scrollbar-none whitespace-nowrap dark:border-slate-800 dark:bg-slate-900/50">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-bold transition outline-none select-none"
      :class="[
        size === 'md' ? 'min-h-10 px-4 py-2 text-sm' : 'min-h-8 px-3.5 py-1.5 text-xs',
        modelValue === tab.id
          ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60',
      ]"
      @click="emit('update:modelValue', tab.id)"
    >
      <component :is="tab.icon" v-if="tab.icon" class="h-4 w-4" />
      {{ tab.label }}
    </button>
  </div>
</template>
