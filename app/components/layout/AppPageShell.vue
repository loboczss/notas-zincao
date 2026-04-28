<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    description?: string
    widthClass?: string
  }>(),
  {
    eyebrow: 'Painel',
    description: '',
    widthClass: 'max-w-7xl',
  },
)
</script>

<template>
  <main class="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 text-slate-800 dark:text-slate-200 md:p-8 transition-colors duration-300">
    <div class="mx-auto" :class="props.widthClass">
      <header class="mb-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <p v-if="props.eyebrow" class="text-xs font-medium text-brand-600 dark:text-brand-400">
              {{ props.eyebrow }}
            </p>
            <h1 class="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 md:text-2xl">
              {{ props.title }}
            </h1>
            <p v-if="props.description" class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {{ props.description }}
            </p>
          </div>

          <div v-if="$slots.headerAside">
            <slot name="headerAside" />
          </div>
        </div>
      </header>

      <slot />
    </div>
  </main>
</template>
