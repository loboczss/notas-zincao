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
    title: 'Modal',
    maxWidthClass: 'max-w-lg',
    contentClass: 'p-5 md:p-8',
    showFooter: true,
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
  <div v-if="props.modelValue" class="fixed inset-0 z-50 flex items-end justify-center p-3 md:items-center md:p-4">
    <button
      type="button"
      class="absolute inset-0 bg-slate-900/40"
      aria-label="Fechar modal"
      @click="fecharModal"
    />

    <section class="relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl ring-1 ring-slate-200 transition-colors duration-300 dark:bg-slate-900 dark:ring-slate-800 md:rounded-2xl" :class="[props.maxWidthClass, props.contentClass]">
      <header class="mb-4 flex items-start justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 md:text-xl">
          {{ props.title }}
        </h2>

        <button
          type="button"
          class="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Fechar"
          @click="fecharModal"
        >
          ✕
        </button>
      </header>

      <div>
        <slot />
      </div>

      <footer v-if="props.showFooter" class="mt-6">
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>
