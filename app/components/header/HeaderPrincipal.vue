<script lang="ts">
export default {
  name: 'HeaderPrincipal',
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Logo from './Logo.vue'
import UserActions from './UserActions.vue'
import DarkModeToggle from '../DarkModeToggle.vue'
import { useAuthStore } from '../../stores'

const authStore = useAuthStore()
const isScrolled = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()

  if (!authStore.profile) {
    authStore.getMe()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header class="sticky top-0 z-40 h-16 w-full md:hidden">
    <div
      class="absolute inset-0 transition-colors duration-300"
      :class="[
        isScrolled
          ? 'border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95'
          : 'border-b border-transparent bg-white/80 backdrop-blur-lg dark:bg-slate-950/80',
      ]"
    />

    <div class="relative flex h-16 items-center justify-between px-4 sm:px-6">
      <Logo />

      <div class="flex items-center gap-2">
        <DarkModeToggle />
        <div class="hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block" />
        <UserActions />
      </div>
    </div>
  </header>
</template>
