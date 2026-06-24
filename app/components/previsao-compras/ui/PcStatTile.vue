<script setup lang="ts">
// KPI compacto: rótulo pequeno em caixa alta, valor destacado, dica opcional.
// tone controla a cor de acento do valor/borda (neutro por padrão).
withDefaults(defineProps<{
  label: string
  value: string | number
  hint?: string
  tone?: 'neutral' | 'brand' | 'emerald' | 'rose' | 'amber'
}>(), {
  tone: 'neutral',
})

const valueTone: Record<string, string> = {
  neutral: 'text-slate-800 dark:text-slate-100',
  brand: 'text-brand-700 dark:text-brand-300',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  rose: 'text-rose-600 dark:text-rose-400',
  amber: 'text-amber-700 dark:text-amber-300',
}

const shell: Record<string, string> = {
  neutral: 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40',
  brand: 'border-brand-200 bg-brand-500/5 dark:border-brand-500/25 dark:bg-brand-500/10',
  emerald: 'border-emerald-200 bg-emerald-500/5 dark:border-emerald-500/20 dark:bg-emerald-500/10',
  rose: 'border-rose-200 bg-rose-500/5 dark:border-rose-500/20 dark:bg-rose-500/10',
  amber: 'border-amber-200 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-500/10',
}
</script>

<template>
  <div class="rounded-xl border p-2.5 shadow-xs" :class="shell[tone]">
    <p class="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ label }}</p>
    <p class="mt-0.5 text-base font-bold tabular-nums tracking-tight" :class="valueTone[tone]">{{ value }}</p>
    <p v-if="hint" class="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">{{ hint }}</p>
  </div>
</template>
