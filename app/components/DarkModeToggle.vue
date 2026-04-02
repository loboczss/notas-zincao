<script lang="ts">
export default {
  name: 'DarkModeToggle'
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Sun, Moon } from 'lucide-vue-next'
// @ts-ignore
import { useColorMode } from '#imports'

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})

const togglePreference = () => {
  // Toggle between specific light and dark modes
  // If current theme is dark (real current theme, not preference), go light
  if (colorMode.value === 'dark') {
    colorMode.preference = 'light'
  } else {
    colorMode.preference = 'dark'
  }
}
</script>

<template>
  <button
    id="theme-toggle"
    type="button"
    @click="togglePreference"
    class="relative h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
    title="Alternar Tema"
  >
    <Sun
      v-if="mounted && isDark"
      class="absolute h-5 w-5 text-amber-500"
    />
    <Moon
      v-else-if="mounted"
      class="absolute h-5 w-5 text-amber-400"
    />
  </button>
</template>

<style scoped>
/* Sem estilo adicional necessário - v-show com transition-opacity é suficiente */
</style>
