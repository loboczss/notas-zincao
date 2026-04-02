<script lang="ts">
export default {
  name: 'NavLink'
}
</script>

<script setup lang="ts">
import type { Component } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  active?: boolean
  icon: Component
  to?: string
}>()

const router = useRouter()

const navigate = () => {
  if (props.to) {
    router.push(props.to)
  }
}
</script>

<template>
  <button
    type="button"
    class="relative group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 focus:outline-none"
    @click="navigate"
    :class="[
      active 
        ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' 
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
    ]"
  >
    <component 
      :is="props.icon" 
      class="h-4 w-4 transition-transform duration-300 group-hover:scale-110" 
      :class="[active ? 'stroke-[2.5px]' : 'stroke-2']"
    />
    <span class="relative">
      <slot />
      <span 
        v-if="active" 
        class="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-amber-600 dark:bg-amber-400 origin-left scale-x-100 transition-transform duration-500"
      />
    </span>
  </button>
</template>
