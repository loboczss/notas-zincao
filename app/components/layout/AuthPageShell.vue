<script lang="ts">
export default {
  name: 'AuthPageShell'
}
</script>

<script setup lang="ts">
import { onMounted } from 'vue'

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

onMounted(() => {
  // Ensure the login CSS is loaded if needed, or it's handled by Nuxt
})
</script>

<template>
  <main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-500">
    <!-- Animated Mesh Background -->
    <div class="bg-mesh-light dark:bg-mesh-dark bg-[length:400%_400%] animate-mesh absolute inset-0 z-0 opacity-100 dark:opacity-80 transition-colors duration-1000" />

    <!-- Subtle Glow Elements -->
    <div class="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-[128px] dark:bg-amber-500/20 animate-pulse pointer-events-none" />
    <div class="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[128px] dark:bg-blue-500/20 animate-pulse pointer-events-none" style="animation-delay: 2s;" />

    <section
      class="bg-white/70 dark:bg-slate-900/60 backdrop-blur-[20px] dark:backdrop-blur-[24px] border border-white/30 dark:border-white/5 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative z-10 w-full rounded-[32px] p-8 md:p-12 transition-all duration-500 hover:shadow-2xl dark:hover:shadow-black/50"
      :class="props.widthClass"
    >
      <div class="relative">
        <div class="mb-8 flex flex-col gap-2">
          <h1 class="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-slate-950 to-slate-600 dark:from-white dark:to-slate-400">
            {{ props.title }}
          </h1>
          <p v-if="props.description" class="text-base leading-relaxed text-slate-600 dark:text-slate-400">
            {{ props.description }}
          </p>
        </div>

        <div class="mt-8">
          <slot />
        </div>
      </div>
    </section>
  </main>
</template>
