<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
  }>(),
  {
    title: 'Modal',
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

    <section class="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200 md:rounded-2xl md:p-8">
      <header class="mb-4 flex items-start justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-900 md:text-xl">
          {{ props.title }}
        </h2>

        <button
          type="button"
          class="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fechar"
          @click="fecharModal"
        >
          ✕
        </button>
      </header>

      <div>
        <slot />
      </div>

      <footer class="mt-6">
        <slot name="footer" />
      </footer>
    </section>
  </div>
</template>
