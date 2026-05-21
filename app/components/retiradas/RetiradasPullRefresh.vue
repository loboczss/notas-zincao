<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'

const props = defineProps<{
  refreshing: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const threshold = 72
const maxPull = 96
const startY = ref<number | null>(null)
const pullDistance = ref(0)
const pullTriggered = ref(false)

const indicatorVisible = computed(() => pullDistance.value > 0 || pullTriggered.value)
const indicatorHeight = computed(() => `${indicatorVisible.value ? 44 : 0}px`)
const indicatorText = computed(() => {
  if (props.refreshing && pullTriggered.value) return 'Atualizando...'
  if (pullDistance.value >= threshold) return 'Solte para atualizar'
  return 'Puxe para atualizar'
})

const canStartPull = () => {
  if (!import.meta.client || props.refreshing) return false
  return window.scrollY <= 0
}

const resetPull = () => {
  startY.value = null
  pullDistance.value = 0
}

const onTouchStart = (event: TouchEvent) => {
  if (!canStartPull()) return
  startY.value = event.touches[0]?.clientY ?? null
}

const onTouchMove = (event: TouchEvent) => {
  if (startY.value === null || props.refreshing) return

  const currentY = event.touches[0]?.clientY ?? startY.value
  const delta = currentY - startY.value

  if (delta <= 0) {
    resetPull()
    return
  }

  if (window.scrollY > 0) return

  pullDistance.value = Math.min(maxPull, Math.round(delta * 0.65))

  if (pullDistance.value > 8) {
    event.preventDefault()
  }
}

const onTouchEnd = () => {
  if (pullDistance.value >= threshold && !props.refreshing) {
    pullTriggered.value = true
    emit('refresh')
    startY.value = null
    return
  }

  resetPull()
}

watch(
  () => props.refreshing,
  (isRefreshing) => {
    if (!isRefreshing) {
      pullTriggered.value = false
      resetPull()
    }
  },
)
</script>

<template>
  <div
    class="relative"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="resetPull"
  >
    <div
      class="flex items-center justify-center overflow-hidden transition-[height,opacity] duration-200"
      :class="indicatorVisible ? 'opacity-100' : 'opacity-0'"
      :style="{ height: indicatorHeight }"
    >
      <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <RefreshCw
          class="h-3.5 w-3.5"
          :class="props.refreshing || pullDistance >= threshold ? 'animate-spin text-brand-600 dark:text-brand-300' : ''"
        />
        {{ indicatorText }}
      </div>
    </div>

    <slot />
  </div>
</template>
