<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

defineProps<{
  inicio: number
  fim: number
  total: number
  currentPage: number
  totalPages: number
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-xs text-slate-500 dark:text-slate-400">
      Mostrando
      <span class="font-semibold text-slate-800 dark:text-slate-200">{{ inicio }}</span>
      ate
      <span class="font-semibold text-slate-800 dark:text-slate-200">{{ fim }}</span>
      de
      <span class="font-semibold text-slate-800 dark:text-slate-200">{{ total }}</span>
    </p>

    <div class="flex items-center justify-end gap-2">
      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        :disabled="currentPage === 1 || loading"
        @click="emit('prev')"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>

      <span class="min-w-16 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
        {{ currentPage }} / {{ totalPages }}
      </span>

      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        :disabled="currentPage === totalPages || loading"
        @click="emit('next')"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
