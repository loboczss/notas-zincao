<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
    title?: string
  }>(),
  {
    variant: 'info',
    title: '',
  },
)

const variantClass = {
  info: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900/50 dark:bg-brand-500/10 dark:text-brand-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-500/10 dark:text-rose-200',
  neutral: 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200',
}
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm"
    :class="variantClass[props.variant]"
  >
    <div v-if="$slots.icon" class="mt-0.5 shrink-0">
      <slot name="icon" />
    </div>

    <div class="min-w-0 flex-1">
      <p v-if="props.title" class="font-bold">
        {{ props.title }}
      </p>
      <div class="leading-relaxed">
        <slot />
      </div>
    </div>

    <div v-if="$slots.actions" class="shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
