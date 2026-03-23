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
  <main class="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 text-slate-800 dark:text-slate-200 md:p-8 transition-colors duration-300">
    <div class="mx-auto space-y-6" :class="props.widthClass">
      <header class="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm md:p-7">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              {{ props.eyebrow }}
            </p>
            <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
              {{ props.title }}
            </h1>
            <p v-if="props.description" class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 md:text-[15px]">
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
