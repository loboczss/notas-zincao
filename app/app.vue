<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import HeaderPrincipal from './components/header/HeaderPrincipal.vue'

const route = useRoute()
const exibirHeader = computed(() => route.path !== '/login')
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
    <NuxtRouteAnnouncer />
    <HeaderPrincipal v-if="exibirHeader" />
    <NuxtPage />
  </div>
</template>
