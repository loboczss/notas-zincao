<script lang="ts">
export default {
  name: 'LoginTabs'
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  activeTab: 'login' | 'cadastro'
}>(), {
  activeTab: 'login',
})

const emit = defineEmits<{
  (e: 'update:activeTab', value: 'login' | 'cadastro'): void
}>()

const setTab = (tab: 'login' | 'cadastro') => {
  emit('update:activeTab', tab)
}
</script>

<template>
  <div class="w-full rounded-lg border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
    <div class="grid min-w-0 grid-cols-2 gap-1">
      <button
        type="button"
        class="relative min-w-0 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-200 sm:px-6"
        :class="activeTab === 'login'
          ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
        @click="setTab('login')"
      >
        Entrar
      </button>

      <button
        type="button"
        class="relative min-w-0 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-200 sm:px-6"
        :class="activeTab === 'cadastro'
          ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
        @click="setTab('cadastro')"
      >
        Cadastrar
      </button>
    </div>
  </div>
</template>
