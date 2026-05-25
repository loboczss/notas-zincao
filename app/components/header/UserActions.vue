<script lang="ts">
export default {
  name: 'UserActions',
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import {
  ChevronDown,
  ClipboardList,
  CloudUpload,
  FilePlus2,
  FileText,
  Gauge,
  LogOut,
  Trash2,
  User,
  Users,
  Warehouse,
} from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseUser } from '#imports'
import { AppRoute } from '../../constants/routes'
import { useAuthStore } from '../../stores'

type MobileNavItem = {
  label: string
  to: string
  icon: Component
  exact?: boolean
}

const props = withDefaults(defineProps<{
  collapsed?: boolean
  placement?: 'header' | 'sidebar'
}>(), {
  collapsed: false,
  placement: 'header',
})

const route = useRoute()
const router = useRouter()
const user = useSupabaseUser()
const authStore = useAuthStore()

const aberto = ref(false)
const menuRef = ref<HTMLDivElement | null>(null)
const carregandoLogout = ref(false)

const toggleMenu = () => {
  aberto.value = !aberto.value
}

const fecharMenu = () => {
  aberto.value = false
}

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
  return email ? email.split('@')[0] : 'Usuario'
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
const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const mobileNavItems = computed<MobileNavItem[]>(() => {
  const items: MobileNavItem[] = [
    {
      label: 'Dashboard',
      to: AppRoute.home,
      icon: Gauge,
      exact: true,
    },
    {
      label: 'Notas',
      to: AppRoute.notas,
      icon: FileText,
    },
    {
      label: 'Retiradas',
      to: AppRoute.retiradas,
      icon: ClipboardList,
      exact: true,
    },
    {
      label: 'Estoque',
      to: AppRoute.estoque,
      icon: Warehouse,
      exact: true,
    },
    {
      label: 'Cadastrar nota',
      to: AppRoute.cadastrarNota,
      icon: FilePlus2,
      exact: true,
    },
    {
      label: 'Sincronizacao',
      to: AppRoute.sincronizacao,
      icon: CloudUpload,
      exact: true,
    },
  ]

  if (isAdmin.value) {
    items.push({
      label: 'Usuarios',
      to: AppRoute.adminUsuarios,
      icon: Users,
    })

    items.push({
      label: 'Auditoria',
      to: AppRoute.adminLixeira,
      icon: Trash2,
    })
  }

  return items
})

const isActive = (item: MobileNavItem) => {
  if (item.exact) {
    return route.path === item.to
  }

  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

const navigate = async (to: string) => {
  await router.push(to)
  fecharMenu()
}

const fazerLogout = async () => {
  carregandoLogout.value = true

  try {
    await authStore.signOut()
    await router.push(AppRoute.login)
  }
  finally {
    carregandoLogout.value = false
    fecharMenu()
  }
}
</script>

<template>
  <div ref="menuRef" class="relative">
    <button
      type="button"
      class="group flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-2.5 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 sm:pr-3"
      :class="[
        props.placement === 'sidebar' && props.collapsed ? 'h-10 w-10 justify-center rounded-xl p-0 sm:p-0' : '',
        props.placement === 'sidebar' && !props.collapsed ? 'w-full justify-between' : '',
        props.placement === 'header' ? 'max-w-[58vw] sm:max-w-none' : '',
        aberto ? 'bg-slate-50 ring-2 ring-brand-500/20 dark:bg-slate-800' : '',
      ]"
      aria-haspopup="menu"
      :aria-expanded="aberto"
      @click="toggleMenu"
    >
      <span class="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white transition-all duration-300 group-hover:ring-brand-400 dark:ring-slate-800 dark:group-hover:ring-brand-500/30">
        <img
          v-if="fotoPerfilUrl"
          :src="fotoPerfilUrl"
          alt="Foto de perfil"
          class="h-full w-full object-cover"
        >
        <span
          v-else
          class="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-black text-white"
        >
          {{ inicial }}
        </span>
      </span>

      <span
        class="max-w-40 truncate text-xs font-bold text-slate-700 transition-colors group-hover:text-brand-700 dark:text-slate-300 dark:group-hover:text-brand-300"
        :class="[
          props.placement === 'sidebar' && !props.collapsed ? 'flex-1 text-left' : '',
          props.placement === 'sidebar' && props.collapsed ? 'hidden' : '',
          props.placement === 'header' ? 'hidden sm:inline' : '',
        ]"
      >
        {{ nomeUsuario }}
      </span>

      <ChevronDown
        v-if="!props.collapsed"
        class="h-3.5 w-3.5 text-slate-400 transition-transform duration-300"
        :class="[aberto ? 'rotate-180 text-brand-600 dark:text-brand-300' : 'group-hover:text-brand-600']"
      />
    </button>

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-if="aberto"
        class="absolute z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        :class="[
          props.placement === 'sidebar' && props.collapsed ? 'left-full top-0 ml-3 w-64 origin-top-left' : '',
          props.placement === 'sidebar' && !props.collapsed ? 'right-0 top-full mt-2 w-full origin-top-right' : '',
          props.placement === 'header' ? 'right-0 top-full mt-2 w-[min(19rem,calc(100vw-1rem))] origin-top-right' : '',
        ]"
      >
        <div class="border-b border-slate-100 px-3 py-2 dark:border-white/5">
          <p class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {{ nomeUsuario }}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Conta conectada
          </p>
        </div>

        <div class="mt-2 grid gap-1 md:hidden">
          <button
            v-for="item in mobileNavItems"
            :key="item.to"
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all"
            :class="[
              isActive(item)
                ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
            ]"
            :aria-current="isActive(item) ? 'page' : undefined"
            @click="navigate(item.to)"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" />
            <span>{{ item.label }}</span>
          </button>

          <div class="my-1 h-px bg-slate-100 dark:bg-white/5" />
        </div>

        <button
          type="button"
          class="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 md:mt-1"
          @click="navigate(AppRoute.profile)"
        >
          <User class="h-4 w-4" />
          <span>Perfil</span>
        </button>

        <div class="my-1 h-px bg-slate-100 dark:bg-white/5" />

        <button
          type="button"
          class="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-600 transition-all hover:bg-rose-50 disabled:cursor-wait disabled:opacity-70 dark:text-rose-400 dark:hover:bg-rose-500/10"
          :disabled="carregandoLogout"
          @click="fazerLogout"
        >
          <LogOut class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span class="font-medium">{{ carregandoLogout ? 'Saindo...' : 'Sair da conta' }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>
