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
  <main class="flex min-h-screen items-center justify-center bg-slate-100 p-4 md:p-6">
    <section class="w-full rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm md:p-8" :class="props.widthClass">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {{ props.title }}
        </h1>
        <p v-if="props.description" class="mt-3 text-sm leading-6 text-slate-600">
          {{ props.description }}
        </p>

        <div class="mt-6">
          <slot />
        </div>
      </div>
    </section>
  </main>
</template>
