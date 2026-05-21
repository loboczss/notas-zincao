<script setup lang="ts">
import Card from '../Card.vue'

const props = withDefaults(
  defineProps<{
    eyebrow: string
    title: string
    paddingClass?: string
  }>(),
  {
    paddingClass: 'p-3 sm:p-3.5',
  },
)
</script>

<template>
  <Card :padding-class="props.paddingClass">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
          {{ props.eyebrow }}
        </p>
        <h2 class="mt-0.5 truncate text-sm font-bold text-slate-950 dark:text-slate-100 sm:text-base">
          {{ props.title }}
        </h2>
      </div>

      <div v-if="$slots.action || $slots.icon" class="flex shrink-0 items-center gap-2">
        <slot name="action" />
        <slot name="icon" />
      </div>
    </div>

    <slot />
  </Card>
</template>
