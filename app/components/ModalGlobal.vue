<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    maxWidthClass?: string
    contentClass?: string
    showFooter?: boolean
  }>(),
  {
    title: '',
    maxWidthClass: 'max-w-lg',
    contentClass: 'p-5 md:p-8',
    showFooter: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const fecharModal = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="props.modelValue" class="fixed inset-0 z-[100] flex items-end justify-center p-3 md:items-center md:p-4 font-sans">
        <!-- Simple Overlay -->
        <button
          type="button"
          class="fixed inset-0 h-screen w-screen bg-slate-900/30 backdrop-blur-sm transition-opacity"
          aria-label="Fechar modal"
          @click="fecharModal"
        />

        <!-- Modal Panel -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <section 
            class="relative z-10 flex flex-col max-h-[90vh] w-full overflow-hidden rounded-t-2xl bg-white/95 shadow-2xl ring-1 ring-slate-200/50 backdrop-blur-xl transition-colors duration-300 dark:bg-slate-900/95 dark:ring-white/10 md:rounded-2xl" 
            :class="[props.maxWidthClass]"
          >
            <!-- Header -->
            <header 
              v-if="props.title || $slots.header" 
              class="flex items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800 md:px-6 md:py-4"
            >
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg">
                {{ props.title }}
              </h2>

              <button
                type="button"
                class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Fechar"
                @click="fecharModal"
              >
                <span class="text-lg leading-none">✕</span>
              </button>
            </header>
            
            <!-- Floating Close Button for when no title is present -->
            <button
              v-else
              type="button"
              class="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 backdrop-blur-sm transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label="Fechar"
              @click="fecharModal"
            >
              <span class="text-sm leading-none">✕</span>
            </button>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto" :class="props.contentClass">
              <slot />
            </div>

            <!-- Footer -->
            <footer 
              v-if="props.showFooter || $slots.footer" 
              class="border-t border-slate-100 p-4 dark:border-slate-800 md:px-6 md:py-4 bg-slate-50/50 dark:bg-slate-950/50"
            >
              <slot name="footer" />
            </footer>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
