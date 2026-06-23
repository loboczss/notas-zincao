<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    title?: string
    align?: 'center' | 'left' | 'right'
  }>(),
  {
    title: '',
    align: 'center',
  }
)

const alignClass = computed(() => {
  if (props.align === 'left') return 'left-0'
  if (props.align === 'right') return 'right-0'
  return 'left-1/2 -translate-x-1/2'
})
</script>

<template>
  <div class="relative group inline-block ml-1.5 cursor-help align-middle select-none">
    <Info class="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 transition dark:text-slate-500 dark:hover:text-slate-400" />
    
    <!-- Tooltip content -->
    <div 
      class="absolute top-full mt-2 w-64 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 ease-out z-50 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-950 text-left"
      :class="alignClass"
    >
      <div v-if="props.title" class="mb-1 text-xs font-bold text-slate-900 dark:text-slate-100">
        {{ props.title }}
      </div>
      <p class="text-[11px] font-normal leading-normal text-slate-600 dark:text-slate-300">
        {{ props.text }}
      </p>
    </div>
  </div>
</template>
