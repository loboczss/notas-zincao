<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  value: string | number
  icon: Component
  iconBgClass?: string
  iconColorClass?: string
}>()
</script>

<template>
  <div class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 font-sans">
    <div 
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      :class="iconBgClass || 'bg-slate-100 text-slate-500 dark:bg-slate-800'"
    >
      <component :is="icon" class="h-4 w-4" :class="iconColorClass" />
    </div>
    <div class="min-w-0">
      <span class="block text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">{{ label }}</span>
      <span class="text-base font-semibold text-slate-900 dark:text-white">{{ value }}</span>
    </div>
  </div>
</template>
