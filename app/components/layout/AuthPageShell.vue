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
  <main class="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#050816] dark:text-slate-100">
    <div class="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#050816] dark:via-[#060a14] dark:to-[#0b1020]" />
    <div class="absolute inset-x-0 top-0 h-px bg-slate-200/80 dark:bg-white/10" />

    <div class="relative z-10 flex min-h-screen w-full items-center justify-center px-5 py-10 sm:px-8">
      <section class="relative w-full max-w-full" :class="props.widthClass">
        <div class="mb-8 flex flex-col gap-2 pr-14 sm:pr-16">
          <h1 class="text-3xl font-bold text-slate-950 dark:text-white md:text-4xl">
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
