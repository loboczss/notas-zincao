<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  {
    description: '',
  },
)
</script>

<template>
  <Card padding-class="px-4 py-14 md:py-16">
    <div class="mx-auto flex max-w-md flex-col items-center text-center">
      <div
        v-if="$slots.icon"
        class="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
      >
        <slot name="icon" />
      </div>

      <h3 class="text-base font-bold text-slate-950 dark:text-slate-50">
        {{ props.title }}
      </h3>
      <p v-if="props.description" class="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {{ props.description }}
      </p>

      <div v-if="$slots.actions" class="mt-5">
        <slot name="actions" />
      </div>
    </div>
  </Card>
</template>
