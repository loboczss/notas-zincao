<script lang="ts">
export default {
  name: 'AuthPageShell'
}
</script>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    widthClass?: string
  }>(),
  {
    description: '',
    widthClass: 'max-w-md',
  },
)
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-white text-slate-950 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-100">
    <div class="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
    <div class="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] auth-grid" />

    <div class="relative z-10 flex min-h-screen w-full items-center justify-center px-5 py-10 sm:px-8">
      <section class="relative w-full max-w-full" :class="props.widthClass">
        <div class="mb-8 flex flex-col gap-2 pr-14 sm:pr-16">
          <h1 class="text-3xl font-extrabold text-slate-950 dark:text-white md:text-4xl">
            {{ props.title }}
          </h1>
          <p v-if="props.description" class="text-base leading-relaxed text-slate-600 dark:text-slate-400">
            {{ props.description }}
          </p>
        </div>

        <div class="mt-8">
          <slot />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.auth-grid {
  background-image:
    linear-gradient(to right, currentColor 1px, transparent 1px),
    linear-gradient(to bottom, currentColor 1px, transparent 1px);
  background-size: 44px 44px;
}
</style>
