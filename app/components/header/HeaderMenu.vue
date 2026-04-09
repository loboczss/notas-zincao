<script lang="ts">
export default {
  name: 'HeaderMenu'
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, House, LogOut, UserCircle2 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import HeaderDropmenu from './HeaderDropmenu.vue'
import HeaderNavButton from './HeaderNavButton.vue'

const carregandoLogout = ref(false)

const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const triggerRef = ref<HTMLButtonElement | null>(null)

const nomeUsuario = computed(() => {
  if (!user.value) {
    return 'Usuário'
  }

  return user.value.user_metadata?.full_name
    || user.value.user_metadata?.name
    || user.value.user_metadata?.nome
    || user.value.email
    || 'Usuário'
})

const fotoPerfilUrl = computed(() => {
  if (!user.value) {
    return ''
  }

  const metadata = user.value.user_metadata || {}
  return String(
    metadata.avatar_url
    || metadata.picture
    || metadata.photo_url
    || '',
  ).trim()
})

const inicialUsuario = computed(() => {
  const nome = String(nomeUsuario.value || '').trim()
  if (!nome) {
    return 'U'
  }

  return nome.charAt(0).toUpperCase()
})

const irParaInicio = async () => {
  await router.push('/')
}

const fazerLogout = async () => {
  carregandoLogout.value = true
  await supabase.auth.signOut()
  carregandoLogout.value = false
  await router.push('/login')
}

const handleCloseAndFocus = (fechar: () => void) => {
  fechar()
  triggerRef.value?.focus()
}
</script>

<template>
  <HeaderDropmenu width-class="w-[min(19rem,calc(100vw-1.5rem))]">
    <template #trigger="{ aberto, toggle }">
      <button
        id="header-menu-toggle"
        ref="triggerRef"
        type="button"
        class="inline-flex max-w-[74vw] items-center gap-2 rounded-full p-1.5 pr-3 text-sm font-medium text-slate-700 transition-all hover:bg-white/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:text-slate-200 dark:hover:bg-slate-800/50 dark:hover:shadow-black/50 sm:max-w-none"
        aria-haspopup="menu"
        :aria-expanded="aberto"
        @click="toggle"
      >
        <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <img
            v-if="fotoPerfilUrl"
            :src="fotoPerfilUrl"
            alt="Foto de perfil"
            class="h-full w-full object-cover"
          >
          <span v-else>{{ inicialUsuario }}</span>
        </span>
        <span class="hidden max-w-40 truncate text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200 sm:inline">
          {{ nomeUsuario }}
        </span>
        <UserCircle2 class="h-4 w-4 text-slate-400 dark:text-slate-500 sm:hidden" />
        <ChevronDown class="h-4 w-4 transition-transform" :class="aberto ? 'rotate-180' : ''" />
      </button>
    </template>

    <template #default="{ fechar }">
      <div class="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <p class="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {{ nomeUsuario }}
        </p>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Conta conectada
        </p>
      </div>

      <div class="mt-2 grid gap-1">
        <HeaderNavButton
          id="header-menu-inicio"
          block
          @click="async () => { await irParaInicio(); handleCloseAndFocus(fechar) }"
        >
          <House class="h-4 w-4" />
          Página inicial
        </HeaderNavButton>

        <HeaderNavButton
          id="header-menu-logout"
          block
          danger
          :disabled="carregandoLogout"
          @click="async () => { await fazerLogout(); handleCloseAndFocus(fechar) }"
        >
          <LogOut class="h-4 w-4" />
          {{ carregandoLogout ? 'Saindo...' : 'Fazer logout' }}
        </HeaderNavButton>
      </div>
    </template>
  </HeaderDropmenu>
</template>
