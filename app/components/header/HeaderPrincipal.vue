<script lang="ts">
export default {
  name: 'HeaderPrincipal'
}
</script>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { LayoutDashboard, FilePlus2, FileText, Boxes, Trash2 } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import Logo from './Logo.vue'
import NavLink from './NavLink.vue'
import UserActions from './UserActions.vue'

const route = useRoute()
const isActive = (path: string) => route.path === path || route.path.startsWith(`${path}/`)

const isScrolled = ref(false)
const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
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
      class="absolute inset-0 transition-all duration-500 ease-in-out"
      :class="[
        isScrolled 
          ? 'bg-white/90 dark:bg-slate-950/95 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.05] shadow-lg shadow-black/5'
          : 'bg-white/10 dark:bg-slate-900/10 backdrop-blur-sm border-b border-transparent shadow-none'
      ]"
    />
    
    <div class="relative mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
      <!-- Left: Brand -->
      <div class="flex items-center">
        <Logo />
      </div>

      <!-- Center: Navigation -->
      <nav class="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
        <NavLink to="/" :active="isActive('/')" :icon="LayoutDashboard">
          Dashboard
        </NavLink>
        <NavLink to="/notas" :active="isActive('/notas')" :icon="FileText">
          Notas
        </NavLink>
        <NavLink to="/estoque" :active="isActive('/estoque')" :icon="Boxes">
          Estoque
        </NavLink>
        <NavLink to="/cadastrar-nota" :active="isActive('/cadastrar-nota')" :icon="FilePlus2">
          Cadastrar
        </NavLink>
        <NavLink to="/admin/lixeira" :active="isActive('/admin/lixeira')" :icon="Trash2">
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
