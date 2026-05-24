<script setup lang="ts">
import { PackagePlus, RotateCw, Search } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  searchTerm: string
  loading?: boolean
  canEdit?: boolean
}>(), {
  loading: false,
  canEdit: false,
})

const emit = defineEmits<{
  (e: 'update:searchTerm', value: string): void
  (e: 'search'): void
  (e: 'refresh'): void
  (e: 'new'): void
}>()
</script>

<template>
  <div class="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
    <label class="relative block min-w-0 flex-1">
      <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        :value="props.searchTerm"
        type="text"
        placeholder="Buscar produto ou ID"
        class="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
        @keyup.enter="emit('search')"
      >
    </label>

    <button
      type="button"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      :disabled="props.loading"
      title="Pesquisar"
      aria-label="Pesquisar"
      @click="emit('search')"
    >
      <Search class="h-4 w-4" />
    </button>

    <button
      type="button"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
      :disabled="props.loading"
      title="Atualizar"
      aria-label="Atualizar"
      @click="emit('refresh')"
    >
      <RotateCw class="h-4 w-4" :class="props.loading ? 'animate-spin' : ''" />
    </button>

    <button
      v-if="props.canEdit"
      type="button"
      class="hidden h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60 sm:inline-flex"
      :disabled="props.loading"
      @click="emit('new')"
    >
      <PackagePlus class="h-4 w-4" />
      Novo
    </button>

    <button
      v-if="props.canEdit"
      type="button"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-500 disabled:opacity-60 sm:hidden"
      :disabled="props.loading"
      title="Novo produto"
      aria-label="Novo produto"
      @click="emit('new')"
    >
      <PackagePlus class="h-4 w-4" />
    </button>
  </div>
</template>
