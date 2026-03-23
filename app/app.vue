<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'
import HeaderPrincipal from './components/header/HeaderPrincipal.vue'

const route = useRoute()
const exibirHeader = computed(() => route.path !== '/login')
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <HeaderPrincipal v-if="exibirHeader" />
    <NuxtPage />
  </div>
</template>
