<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AppRoute, getPageTitle } from './constants/routes'

const route = useRoute()
const authOnlyRoutes = new Set<string>([
  AppRoute.login,
  AppRoute.confirm,
  AppRoute.redefinirSenha,
])
const exibirHeader = computed(() => !authOnlyRoutes.has(route.path))
const pageTitle = computed(() => getPageTitle(route.path))
const sidebarCollapsed = useState<boolean>('sidebar-collapsed', () => false)

useHead(() => ({
  title: `${pageTitle.value} | Notas Zincao`,
}))
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
    <NuxtRouteAnnouncer />
    <HeaderPrincipal v-if="exibirHeader" />
    <LayoutDesktopSidebar v-if="exibirHeader" />
    <div :class="exibirHeader ? (sidebarCollapsed ? 'pb-24 md:pb-0 md:pl-20' : 'pb-24 md:pb-0 md:pl-72') : ''">
      <NuxtPage />
    </div>
    <LayoutMobileBottomNav v-if="exibirHeader" />
    <OfflineSyncStatus />
    <Toast />
  </div>
</template>
