<script lang="ts">
export default {
  name: 'DesktopSidebar',
}
</script>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { Component } from 'vue'
import {
  ClipboardList,
  CloudUpload,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FileText,
  Gauge,
  PackageSearch,
  Trash2,
  Users,
  Warehouse,
} from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import Logo from '../header/Logo.vue'
import UserActions from '../header/UserActions.vue'
import DarkModeToggle from '../DarkModeToggle.vue'
import { AppRoute } from '../../constants/routes'
import { useAuthStore } from '../../stores'

type SidebarItem = {
  label: string
  to: string
  icon: Component
  exact?: boolean
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isCollapsed = useState<boolean>('sidebar-collapsed', () => false)
const sidebarStorageKey = 'notas-zincao-sidebar-collapsed'

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const principalItems: SidebarItem[] = [
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
    label: 'Stock Integrin',
    to: AppRoute.stockIntegrin,
    icon: PackageSearch,
    exact: true,
  },
]

const operacaoItems: SidebarItem[] = [
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

const adminItems = computed<SidebarItem[]>(() => {
  if (!isAdmin.value) {
    return []
  }

  const items: SidebarItem[] = [
    {
      label: 'Auditoria',
      to: AppRoute.adminLixeira,
      icon: Trash2,
    },
  ]

  items.unshift({
    label: 'Usuarios',
    to: AppRoute.adminUsuarios,
    icon: Users,
  })

  return items
})

const sections = computed(() => [
  {
    title: 'Principal',
    items: principalItems,
  },
  {
    title: 'Operacao',
    items: operacaoItems,
  },
  {
    title: 'Administracao',
    items: adminItems.value,
  },
].filter(section => section.items.length > 0))

const isActive = (item: SidebarItem) => {
  if (item.exact) {
    return route.path === item.to
  }

  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

const navigate = async (to: string) => {
  await router.push(to)
}

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
}

onMounted(() => {
  const storedCollapsed = window.localStorage.getItem(sidebarStorageKey)
  if (storedCollapsed === 'true' || storedCollapsed === 'false') {
    isCollapsed.value = storedCollapsed === 'true'
  }

  if (!authStore.profile) {
    authStore.getMe()
  }
})

watch(isCollapsed, (value) => {
  if (import.meta.client) {
    window.localStorage.setItem(sidebarStorageKey, String(value))
  }
})
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white/95 shadow-[12px_0_28px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-[width] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950/95 md:flex"
    :class="isCollapsed ? 'w-20' : 'w-72'"
    aria-label="Navegacao principal"
  >
    <button
      type="button"
      class="absolute -right-3 top-20 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition hover:scale-105 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-brand-500/35 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
      :title="isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'"
      :aria-label="isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'"
      @click="toggleCollapsed"
    >
      <ChevronRight v-if="isCollapsed" class="h-4 w-4" />
      <ChevronLeft v-else class="h-4 w-4" />
    </button>

    <div class="flex min-h-0 w-full flex-col">
      <div
        class="border-b border-slate-200 py-4 dark:border-slate-800"
        :class="isCollapsed ? 'px-3' : 'px-4'"
      >
        <div
          class="gap-3"
          :class="isCollapsed ? 'flex flex-col items-center' : 'flex items-center justify-between'"
        >
          <Logo />

          <DarkModeToggle />
        </div>

        <div
          class="mt-4 gap-3"
          :class="isCollapsed ? 'flex flex-col items-center' : 'grid'"
        >
          <UserActions placement="sidebar" :collapsed="isCollapsed" />
        </div>
      </div>

      <div
        class="min-h-0 flex-1 overflow-y-auto py-5"
        :class="isCollapsed ? 'px-3' : 'px-4 pr-5'"
      >
        <div v-if="!isCollapsed" class="mb-4 px-2">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
            Painel
          </p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Navegacao do sistema
          </p>
        </div>

        <div :class="isCollapsed ? 'space-y-3' : 'space-y-6'">
          <section v-for="section in sections" :key="section.title">
            <p
              v-if="!isCollapsed"
              class="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500"
            >
              {{ section.title }}
            </p>
            <div class="grid gap-1">
              <button
                v-for="item in section.items"
                :key="item.to"
                type="button"
                class="group flex h-11 w-full items-center rounded-lg text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/35"
                :class="[
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3 text-left',
                  isActive(item)
                    ? 'bg-brand-100 text-slate-950 shadow-sm dark:bg-brand-500/15 dark:text-brand-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100',
                ]"
                :aria-current="isActive(item) ? 'page' : undefined"
                :aria-label="item.label"
                :title="isCollapsed ? item.label : undefined"
                @click="navigate(item.to)"
              >
                <component
                  :is="item.icon"
                  class="h-5 w-5 shrink-0"
                  :class="isActive(item) ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200'"
                />
                <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </aside>
</template>
