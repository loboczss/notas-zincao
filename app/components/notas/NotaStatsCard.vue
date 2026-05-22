<script setup lang="ts">
import type { Component } from 'vue'
import Card from '../Card.vue'

defineProps<{
  label: string
  value: string | number
  icon: Component
  iconBgClass?: string
  iconColorClass?: string
}>()
</script>

<template>
  <Card padding-class="p-3" class="min-w-0 overflow-hidden">
    <div class="grid min-h-14 min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2">
      <div
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        :class="iconBgClass || 'bg-slate-100 text-slate-500 dark:bg-slate-800'"
      >
        <component :is="icon" class="h-4 w-4" :class="iconColorClass" />
      </div>

      <div class="min-w-0">
        <span class="block truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {{ label }}
        </span>
        <span class="mt-1 block max-w-full break-words text-[15px] font-bold leading-tight text-slate-950 dark:text-white">
          {{ value }}
        </span>
      </div>
    </div>
  </Card>
</template>
