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
    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none"
    @click="navigate"
    :class="[
      active 
        ? 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-500/10' 
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
    ]"
  >
    <component 
      :is="props.icon" 
      class="h-4 w-4" 
      :class="[active ? 'stroke-[2.5px] text-brand-600 dark:text-brand-400' : 'stroke-2']"
    />
    <span>
      <slot />
    </span>
  </button>
</template>
