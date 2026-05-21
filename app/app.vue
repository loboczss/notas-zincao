<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import HeaderPrincipal from './components/header/HeaderPrincipal.vue'
import Toast from './components/Toast.vue'
import OfflineSyncStatus from './components/OfflineSyncStatus.vue'
import MobileBottomNav from './components/layout/MobileBottomNav.vue'
import { AppRoute, getPageTitle } from './constants/routes'

const route = useRoute()
const exibirHeader = computed(() => route.path !== AppRoute.login)
const pageTitle = computed(() => getPageTitle(route.path))

useHead(() => ({
  title: `${pageTitle.value} | Notas Zincao`,
}))
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
    <NuxtRouteAnnouncer />
    <HeaderPrincipal v-if="exibirHeader" />
    <div :class="exibirHeader ? 'pb-24 md:pb-0' : ''">
      <NuxtPage />
    </div>
    <MobileBottomNav v-if="exibirHeader" />
    <OfflineSyncStatus />
    <Toast />
  </div>
</template>
