<script setup lang="ts">
import type { Component } from 'vue'

// Estado vazio compacto e padronizado.
defineProps<{
  text: string
  icon?: Component
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 py-8 text-center">
    <component :is="icon" v-if="icon" class="h-5 w-5 text-slate-300 dark:text-slate-600" />
    <p class="text-sm font-medium text-slate-400 dark:text-slate-500">{{ text }}</p>
  </div>
</template>
