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
  <div class="rounded-2xl border border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 backdrop-blur-md">
    <div class="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        class="relative rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300"
        :class="activeTab === 'login'
          ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-lg shadow-black/5 dark:shadow-white/5 ring-1 ring-black/5 dark:ring-white/10'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
        @click="setTab('login')"
      >
        Entrar
      </button>

      <button
        type="button"
        class="relative rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300"
        :class="activeTab === 'cadastro'
          ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-lg shadow-black/5 dark:shadow-white/5 ring-1 ring-black/5 dark:ring-white/10'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
        @click="setTab('cadastro')"
      >
        Cadastrar
      </button>
    </div>
  </div>
</template>
