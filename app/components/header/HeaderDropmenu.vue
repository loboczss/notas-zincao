<script lang="ts">
export default {
  name: 'HeaderDropmenu'
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  widthClass?: string
}>(), {
  widthClass: 'w-64',
})

const aberto = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const fechar = () => {
  aberto.value = false
}

const toggle = () => {
  aberto.value = !aberto.value
}

const handleDocumentClick = (event: MouseEvent) => {
  if (!aberto.value || !rootRef.value) {
    return
  }

  const target = event.target as Node | null
  if (target && !rootRef.value.contains(target)) {
    fechar()
  }
}

const handleEsc = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    fechar()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEsc)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEsc)
})

defineExpose({
  fechar,
  toggle,
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <slot name="trigger" :aberto="aberto" :toggle="toggle" :fechar="fechar" />

    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="aberto"
        class="absolute right-0 z-40 mt-2 rounded-3xl border border-white/40 bg-white/80 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/60"
        :class="props.widthClass"
      >
        <slot :fechar="fechar" />
      </div>
    </transition>
  </div>
</template>
