<script lang="ts">
export default {
  name: 'UserActions'
}
</script>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown, LogOut, User, LayoutDashboard, FilePlus2, FileText, Boxes } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useAuthStore } from '../../stores'
import DarkModeToggle from '../DarkModeToggle.vue'

const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const authStore = useAuthStore()

const aberto = ref(false)
const menuRef = ref<HTMLDivElement | null>(null)

const toggleMenu = () => (aberto.value = !aberto.value)
const fecharMenu = () => (aberto.value = false)

const handleOutsideClick = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    fecharMenu()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick)
  if (!authStore.profile) {
    authStore.getMe()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})

const nomeUsuario = computed(() => {
  const nomePerfil = String(authStore.profile?.nome || '').trim()
  if (nomePerfil) {
    return nomePerfil
  }

  const metadata = user.value?.user_metadata
  const nomeMetadata = String(metadata?.full_name || metadata?.name || metadata?.nome || '').trim()
  if (nomeMetadata) {
    return nomeMetadata
  }

  const email = String(user.value?.email || authStore.profile?.email || '').trim()
  return email ? email.split('@')[0] : 'Usuário'
})

const fotoPerfilUrl = computed(() => {
  const fotoPerfil = String(authStore.profile?.foto_perfil || '').trim()
  if (fotoPerfil) {
    return fotoPerfil
  }

  const metadata = user.value?.user_metadata || {}
  return String(metadata.avatar_url || metadata.picture || metadata.photo_url || '').trim()
})
const inicial = computed(() => nomeUsuario.value?.[0]?.toUpperCase() || 'U')

const fazerLogout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="flex items-center gap-1 sm:gap-2">
    <!-- Dark Mode Integrated subtly -->
    <div class="mr-1 hidden sm:block">
      <DarkModeToggle />
    </div>

    <!-- User Profile Dropdown -->
    <div ref="menuRef" class="relative">
      <button
        @click="toggleMenu"
        class="group flex items-center gap-2 rounded-full border border-white/40 bg-white/40 dark:border-white/10 dark:bg-white/5 p-1 pr-3 shadow-sm backdrop-blur-md transition-all duration-500 hover:shadow-xl hover:shadow-brand-500/10 hover:border-brand-500/30 active:scale-95 focus:outline-none"
        :class="[aberto ? 'ring-4 ring-brand-500/10 shadow-lg border-brand-500/40' : '']"
      >
        <div class="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-800 transition-all duration-500 group-hover:ring-brand-400 dark:group-hover:ring-brand-500/30">
          <img v-if="fotoPerfilUrl" :src="fotoPerfilUrl" class="h-full w-full object-cover">
          <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-black text-white">
            {{ inicial }}
          </div>
        </div>
        <span class="hidden sm:inline text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
          {{ nomeUsuario }}
        </span>
        <ChevronDown 
          class="h-3 w-3 text-slate-400 transition-transform duration-500"
          :class="[aberto ? 'rotate-180 text-brand-500' : ' group-hover:text-brand-500']"
        />
      </button>

      <!-- Dropdown Menu -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-2 scale-95"
      >
        <div v-if="aberto" class="absolute right-0 top-full z-50 mt-3 w-56 origin-top-right rounded-2xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/90 p-2 shadow-2xl backdrop-blur-2xl">
          <div class="px-3 py-2 sm:hidden border-b border-slate-100 dark:border-white/5 mb-1">
             <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-tighter">Tema</span>
                <DarkModeToggle />
             </div>
          </div>
          
          <button @click="router.push('/'); fecharMenu()" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition-all hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400">
            <LayoutDashboard class="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button @click="router.push('/notas'); fecharMenu()" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition-all hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400">
            <FileText class="h-4 w-4" />
            <span>Notas</span>
          </button>

          <button @click="router.push('/estoque'); fecharMenu()" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition-all hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400">
            <Boxes class="h-4 w-4" />
            <span>Estoque</span>
          </button>

          <button @click="router.push('/cadastrar-nota'); fecharMenu()" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition-all hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400">
            <FilePlus2 class="h-4 w-4" />
            <span>Cadastrar nota</span>
          </button>
          
          <button @click="router.push('/profile'); fecharMenu()" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300 transition-all hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400">
            <User class="h-4 w-4" />
            <span>Perfil</span>
          </button>
          
          <div class="my-1 h-px bg-slate-100 dark:bg-white/5" />
          
          <button @click="fazerLogout" class="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-600 transition-all hover:bg-rose-50 dark:hover:bg-rose-500/10">
            <LogOut class="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span class="font-medium">Sair da conta</span>
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>
