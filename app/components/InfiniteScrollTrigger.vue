<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  loading?: boolean
  done?: boolean
  disabled?: boolean
  loadedCount?: number
  total?: number
  label?: string
  doneLabel?: string
}>(), {
  loading: false,
  done: false,
  disabled: false,
  loadedCount: 0,
  total: 0,
  label: 'itens',
  doneLabel: 'Tudo carregado.',
})

const emit = defineEmits<{
  (e: 'load-more'): void
}>()

const sentinelRef = ref<HTMLElement | null>(null)
const isIntersecting = ref(false)
const emittedForCurrentPass = ref(false)
let observer: IntersectionObserver | null = null

const canLoad = () => {
  return !props.loading && !props.done && !props.disabled
}

const requestMore = () => {
  if (!canLoad() || emittedForCurrentPass.value) return
  emittedForCurrentPass.value = true
  emit('load-more')
}

const setupObserver = () => {
  if (!import.meta.client || !sentinelRef.value || observer) return

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      isIntersecting.value = Boolean(entry?.isIntersecting)
      if (isIntersecting.value) {
        requestMore()
      }
    },
    {
      root: null,
      rootMargin: '420px 0px 520px 0px',
      threshold: 0.01,
    },
  )

  observer.observe(sentinelRef.value)
}

watch(
  () => props.loading,
  async (loading) => {
    if (loading) return
    emittedForCurrentPass.value = false
    await nextTick()
    if (isIntersecting.value) {
      requestMore()
    }
  },
)

watch(
  () => [props.done, props.disabled],
  () => {
    emittedForCurrentPass.value = false
  },
)

onMounted(async () => {
  await nextTick()
  setupObserver()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div ref="sentinelRef" class="flex min-h-16 items-center justify-center px-3 py-4 text-center">
    <div v-if="props.loading" class="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      Carregando mais {{ props.label }}...
    </div>

    <p v-else-if="props.done && props.loadedCount > 0" class="text-xs text-slate-400 dark:text-slate-500">
      {{ props.doneLabel }}
    </p>

    <p v-else-if="props.total > 0" class="text-xs text-slate-400 dark:text-slate-500">
      Mostrando {{ props.loadedCount }} de {{ props.total }}.
    </p>
  </div>
</template>
