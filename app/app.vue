<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import HeaderPrincipal from './components/header/HeaderPrincipal.vue'
import Toast from './components/Toast.vue'


const route = useRoute()
const exibirHeader = computed(() => route.path !== '/login')

const pageTitle = computed(() => {
  const path = route.path

  if (path === '/') return 'Dashboard'
  if (path === '/login') return 'Login'
  if (path === '/confirm') return 'Confirmacao de Conta'
  if (path === '/notas') return 'Notas de Retirada'
  if (path === '/notas/index') return 'Notas de Retirada'
  if (path.startsWith('/notas/') && path.endsWith('/retirada')) return 'Retirada da Nota'
  if (path === '/estoque') return 'Estoque'
  if (path === '/cadastrar-nota') return 'Cadastrar Nota'
  if (path === '/profile') return 'Perfil'
  if (path === '/admin/lixeira') return 'Lixeira de Auditoria'
  if (path.includes('/historico')) return 'Histórico de Auditoria'

  return 'Notas Zincao'
})

useHead(() => ({
  title: `${pageTitle.value} | Notas Zincao`,
}))
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
    <NuxtRouteAnnouncer />
    <HeaderPrincipal v-if="exibirHeader" />
    <NuxtPage />
    <Toast />
  </div>

</template>
