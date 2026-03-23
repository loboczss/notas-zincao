<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    icon?: string
  }>(),
  {
    icon: '',
  },
)

const iconKey = computed(() => String(props.icon || '').trim())
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-slate-50/70 p-5 md:p-6">
    <header class="mb-5 flex items-center gap-3">
      <span v-if="props.icon" class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
        <svg v-if="iconKey === 'person'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
        <svg v-else-if="iconKey === 'description'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <path d="M7 3.5h7l3 3V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
          <path d="M14 3.5V7h3" />
          <path d="M9 11h6M9 15h6" />
        </svg>
        <svg v-else-if="iconKey === 'inventory_2'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <path d="M3 8h18l-2 12H5L3 8Z" />
          <path d="M9 8V5h6v3" />
        </svg>
        <svg v-else-if="iconKey === 'calendar_today'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 9h18" />
        </svg>
        <svg v-else-if="iconKey === 'payments'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <circle cx="12" cy="14" r="1.5" />
        </svg>
        <svg v-else-if="iconKey === 'smart_toy'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <rect x="5" y="7" width="14" height="12" rx="2" />
          <circle cx="9.5" cy="12" r="1" />
          <circle cx="14.5" cy="12" r="1" />
          <path d="M10 15h4M12 4v3" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <circle cx="12" cy="12" r="8" />
        </svg>
      </span>
      <h2 class="text-lg font-bold text-blue-900">
        {{ props.title }}
      </h2>
    </header>

    <slot />
  </section>
</template>
