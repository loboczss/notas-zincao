<script setup lang="ts">
// Selo compacto reutilizável (classe ABC/XYZ, confiança, status de oportunidade).
withDefaults(defineProps<{
  tone?: 'neutral' | 'brand' | 'emerald' | 'rose' | 'amber' | 'sky'
  size?: 'sm' | 'md'
}>(), {
  tone: 'neutral',
  size: 'md',
})

const toneMap: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
}
</script>

<template>
  <span
    class="inline-flex items-center justify-center gap-1 rounded-full font-bold"
    :class="[toneMap[tone], size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]']"
  >
    <slot />
  </span>
</template>
