<script setup lang="ts">
import { Search, RotateCw, PackagePlus, Play } from 'lucide-vue-next'

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
  <div class="flex w-full flex-col gap-3 rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
    <div class="grid w-full gap-3 lg:max-w-3xl lg:grid-cols-[1fr_auto]">
      <label class="relative block min-w-0">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          :value="props.searchTerm"
          type="text"
          placeholder="Buscar por descrição ou ID do produto"
          class="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          @input="emit('update:searchTerm', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('search')"
        >
      </label>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
        :disabled="props.loading"
        @click="emit('search')"
      >
        <Play class="h-4 w-4" />
        Pesquisar
      </button>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2">
      <button
        v-if="props.canEdit"
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
        :disabled="props.loading"
        @click="emit('new')"
      >
        <PackagePlus class="h-4 w-4" />
        Novo produto
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        :disabled="props.loading"
        @click="emit('refresh')"
      >
        <RotateCw class="h-4 w-4" :class="props.loading ? 'animate-spin' : ''" />
        Atualizar
      </button>
    </div>
  </div>
</template>
