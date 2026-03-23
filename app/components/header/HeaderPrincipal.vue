<script setup lang="ts">
import { navigateTo, useRoute } from '#imports'
import HeaderMenu from './HeaderMenu.vue'

const route = useRoute()

const isActive = (path: string) => route.path === path

const irParaIndex = async () => {
  await navigateTo('/')
}

const irParaCadastrarNota = async () => {
  await navigateTo('/cadastrar-nota')
}

const irParaListarNotas = async () => {
  await navigateTo('/listar-notas')
}

const irParaRetiradaNotas = async () => {
  await navigateTo('/retirada-notas')
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
    <div class="mx-auto max-w-7xl px-3 py-3 md:px-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center justify-between gap-3 md:min-w-[180px] md:justify-start">
          <button
            type="button"
            class="max-w-[70vw] truncate rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 md:max-w-none"
            @click="irParaIndex"
          >
            Notas ZINCÃO
          </button>

          <div class="flex items-center gap-2 md:hidden">
            <DarkModeToggle />
            <HeaderMenu />
          </div>
        </div>

        <nav class="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-1 md:justify-center md:overflow-visible md:px-0 md:pb-0">
          <button
            id="header-index-button"
            type="button"
            class="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:text-sm"
            :class="isActive('/')
              ? 'bg-blue-600 text-white'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
            @click="irParaIndex"
          >
            Index
          </button>

          <button
            id="header-cadastrar-nota-button"
            type="button"
            class="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:text-sm"
            :class="isActive('/cadastrar-nota')
              ? 'bg-blue-600 text-white'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
            @click="irParaCadastrarNota"
          >
            Cadastrar nota
          </button>

          <button
            id="header-listar-notas-button"
            type="button"
            class="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:text-sm"
            :class="isActive('/listar-notas')
              ? 'bg-blue-600 text-white'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
            @click="irParaListarNotas"
          >
            Listar notas
          </button>

          <button
            id="header-retirada-notas-button"
            type="button"
            class="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 sm:text-sm"
            :class="isActive('/retirada-notas')
              ? 'bg-blue-600 text-white'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
            @click="irParaRetiradaNotas"
          >
            Retirada
          </button>
        </nav>

        <div class="hidden md:flex md:min-w-[220px] md:items-center md:justify-end md:gap-4 md:text-right">
          <DarkModeToggle />
          <HeaderMenu />
        </div>
      </div>
    </div>
  </header>
</template>
