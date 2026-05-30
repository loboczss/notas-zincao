<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    tone?: 'brand' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate'
  }>(),
  {
    tone: 'brand',
  },
)

const toneClass = {
  brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}
</script>

<template>
  <Card padding-class="p-4 md:p-5">
    <div class="flex items-center gap-4">
      <div
        v-if="$slots.icon"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        :class="toneClass[props.tone]"
      >
        <slot name="icon" />
      </div>

      <div class="min-w-0">
        <p class="text-2xl font-bold text-slate-950 dark:text-slate-50">
          {{ props.value }}
        </p>
        <p class="mt-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
          {{ props.label }}
        </p>
      </div>
    </div>
  </Card>
</template>
