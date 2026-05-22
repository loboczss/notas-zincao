<script lang="ts">
export default {
  name: 'MobileBottomNav',
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { ClipboardList, CloudUpload, FilePlus2, FileText, Home } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { AppRoute } from '../../constants/routes'

const route = useRoute()
const router = useRouter()

const items = [
  {
    label: 'Inicio',
    to: AppRoute.home,
    icon: Home,
    exact: true,
    primary: false,
  },
  {
    label: 'Notas',
    to: AppRoute.notas,
    icon: FileText,
    exact: false,
    primary: false,
  },
  {
    label: 'Cadastrar',
    to: AppRoute.cadastrarNota,
    icon: FilePlus2,
    exact: true,
    primary: true,
  },
  {
    label: 'Histórico',
    to: AppRoute.retiradas,
    icon: ClipboardList,
    exact: true,
    primary: false,
  },
  {
    label: 'Sync',
    to: AppRoute.sincronizacao,
    icon: CloudUpload,
    exact: true,
    primary: false,
  },
] as const

const isActive = (item: typeof items[number]) => {
  if (item.exact) {
    return route.path === item.to
  }

  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

const navClass = computed(() => 'fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 md:hidden')
</script>

<template>
  <nav :class="navClass" aria-label="Navegacao mobile principal">
    <div class="mx-auto grid max-w-md grid-cols-5 gap-1">
      <button
        v-for="item in items"
        :key="item.to"
        type="button"
        class="flex flex-col items-center justify-center gap-1 px-1.5 text-[11px] font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        :class="[
          item.primary
            ? 'h-16 rounded-xl text-amber-500 hover:text-amber-600 active:scale-[0.98] dark:text-brand-300 dark:hover:text-brand-200'
            : 'h-16 rounded-xl',
          item.primary && isActive(item)
            ? 'text-amber-600 dark:text-brand-300'
            : '',
          !item.primary && isActive(item)
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
            : '',
          !item.primary && !isActive(item)
            ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            : '',
        ]"
        :aria-current="isActive(item) ? 'page' : undefined"
        @click="router.push(item.to)"
      >
        <component
          :is="item.icon"
          class="h-5 w-5"
          :class="item.primary || isActive(item) ? 'stroke-[2.5px]' : 'stroke-2'"
        />
        <span class="leading-none">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>
