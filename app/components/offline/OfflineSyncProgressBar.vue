<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  value: number
  detail?: string
  tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate'
}>(), {
  detail: '',
  tone: 'brand',
})

const toneClass = {
  brand: 'bg-brand-600',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-500',
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {{ props.label }}
      </span>
      <span class="shrink-0 text-xs font-bold text-slate-900 dark:text-slate-100">
        {{ Math.round(props.value) }}%
      </span>
    </div>

    <div class="h-2 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
      <div
        class="h-full rounded transition-all duration-300"
        :class="toneClass[props.tone]"
        :style="{ width: `${Math.min(100, Math.max(0, props.value))}%` }"
      />
    </div>

    <p v-if="props.detail" class="text-xs text-slate-500 dark:text-slate-400">
      {{ props.detail }}
    </p>
  </div>
</template>

