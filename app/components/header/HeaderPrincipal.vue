<script lang="ts">
export default {
  name: 'HeaderPrincipal'
}
</script>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { LayoutDashboard, FilePlus2, FileText, Boxes, Trash2, Users } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import Logo from './Logo.vue'
import NavLink from './NavLink.vue'
import UserActions from './UserActions.vue'
import { AppRoute } from '../../constants/routes'
import { useAuthStore } from '../../stores'

const route = useRoute()
const authStore = useAuthStore()
const isActive = (path: string) => route.path === path || route.path.startsWith(`${path}/`)
const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const isScrolled = ref(false)
const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
  if (!authStore.profile) {
    authStore.getMe()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header 
    class="sticky top-0 z-40 w-full transition-all duration-500 ease-in-out"
    :class="[isScrolled ? 'h-16' : 'h-20']"
  >
    <!-- Dynamic backdrop -->
    <div 
      class="absolute inset-0 transition-colors duration-300"
      :class="[
        isScrolled 
          ? 'bg-white border-b border-slate-200 dark:bg-slate-950 dark:border-slate-800'
          : 'bg-transparent border-b border-transparent'
      ]"
    />
    
    <div class="relative mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
      <!-- Left: Brand -->
      <div class="flex items-center">
        <Logo />
      </div>

      <!-- Center: Navigation -->
      <nav class="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
        <NavLink :to="AppRoute.home" :active="isActive(AppRoute.home)" :icon="LayoutDashboard">
          Dashboard
        </NavLink>
        <NavLink :to="AppRoute.notas" :active="isActive(AppRoute.notas)" :icon="FileText">
          Notas
        </NavLink>
        <NavLink :to="AppRoute.estoque" :active="isActive(AppRoute.estoque)" :icon="Boxes">
          Estoque
        </NavLink>
        <NavLink :to="AppRoute.cadastrarNota" :active="isActive(AppRoute.cadastrarNota)" :icon="FilePlus2">
          Cadastrar
        </NavLink>
        <NavLink v-if="isAdmin" :to="AppRoute.adminUsuarios" :active="isActive(AppRoute.adminUsuarios)" :icon="Users">
          Usuários
        </NavLink>
        <NavLink :to="AppRoute.adminLixeira" :active="isActive(AppRoute.adminLixeira)" :icon="Trash2">
          Auditoria
        </NavLink>
      </nav>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2">
        <div class="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />
        <UserActions />
      </div>
    </div>
  </header>
</template>
