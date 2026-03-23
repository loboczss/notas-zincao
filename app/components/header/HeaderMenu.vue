<script setup lang="ts">
import { computed, ref } from 'vue'
import { navigateTo, useSupabaseClient, useSupabaseUser } from '#imports'

const menuAberto = ref(false)
const carregandoLogout = ref(false)

const supabase = useSupabaseClient()
const user = useSupabaseUser()

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

const toggleMenu = () => {
  menuAberto.value = !menuAberto.value
}

const irParaUsuario = async () => {
  menuAberto.value = false
  await navigateTo('/usuario')
}

const irParaCadastrarNota = async () => {
  menuAberto.value = false
  await navigateTo('/cadastrar-nota')
}

const irParaListarNotas = async () => {
  menuAberto.value = false
  await navigateTo('/listar-notas')
}

const irParaRetiradaNotas = async () => {
  menuAberto.value = false
  await navigateTo('/retirada-notas')
}

const fazerLogout = async () => {
  carregandoLogout.value = true
  await supabase.auth.signOut()
  carregandoLogout.value = false
  menuAberto.value = false
  await navigateTo('/login')
}
</script>

<template>
  <div class="relative">
    <button
      id="header-menu-toggle"
      type="button"
      class="inline-flex max-w-[72vw] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 sm:max-w-none"
      @click="toggleMenu"
    >
      <span class="max-w-28 truncate sm:max-w-44">{{ nomeUsuario }}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="h-4 w-4 transition-transform"
        :class="menuAberto ? 'rotate-180' : 'rotate-0'"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div
      v-if="menuAberto"
      class="absolute right-0 z-20 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
    >
      <div class="mb-1 border-b border-slate-200 px-3 py-2">
        <p class="truncate text-sm font-semibold text-slate-800">
          {{ nomeUsuario }}
        </p>
        <p class="text-xs text-slate-500">
          Menu da conta
        </p>
      </div>

      <button
        id="header-menu-usuario"
        type="button"
        class="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        @click="irParaUsuario"
      >
        Página de usuário
      </button>

      <button
        id="header-menu-cadastrar-nota"
        type="button"
        class="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        @click="irParaCadastrarNota"
      >
        Cadastrar nota
      </button>

      <button
        id="header-menu-listar-notas"
        type="button"
        class="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        @click="irParaListarNotas"
      >
        Listar notas
      </button>

      <button
        id="header-menu-retirada-notas"
        type="button"
        class="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        @click="irParaRetiradaNotas"
      >
        Retirada de notas
      </button>

      <button
        id="header-menu-logout"
        type="button"
        class="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
        :disabled="carregandoLogout"
        @click="fazerLogout"
      >
        {{ carregandoLogout ? 'Saindo...' : 'Fazer logout' }}
      </button>
    </div>
  </div>
</template>
