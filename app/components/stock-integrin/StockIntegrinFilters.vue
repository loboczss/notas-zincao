<script setup lang="ts">
import { computed } from 'vue'
import { Search } from 'lucide-vue-next'
import Botao from '../Botao.vue'
import Input from '../Input.vue'

const props = withDefaults(defineProps<{
  searchTerm: string
  idempresa: string
  onlyAvailable: boolean
  empresas?: number[]
  loading?: boolean
}>(), {
  empresas: () => [],
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:searchTerm', value: string): void
  (e: 'update:idempresa', value: string): void
  (e: 'update:onlyAvailable', value: boolean): void
  (e: 'apply'): void
}>()

const companyOptions = computed(() => {
  const selected = Number(props.idempresa || 0)
  const options = new Set(props.empresas.length ? props.empresas : [1, 2, 3, 4, 5, 6])

  if (selected) {
    options.add(selected)
  }

  return [...options].sort((a, b) => a - b)
})
</script>

<template>
  <form
    class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[minmax(260px,1fr)_160px_180px_auto]"
    @submit.prevent="emit('apply')"
  >
    <label class="relative block">
      <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        :model-value="props.searchTerm"
        type="search"
        class="h-10 pl-9"
        placeholder="Produto, cod. PROD ou barras"
        @update:model-value="emit('update:searchTerm', $event)"
      />
    </label>

    <select
      :value="props.idempresa"
      class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      aria-label="Empresa"
      @change="emit('update:idempresa', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">Todas empresas</option>
      <option v-for="empresa in companyOptions" :key="empresa" :value="String(empresa)">
        Empresa {{ empresa }}
      </option>
    </select>

    <label class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
      <input
        :checked="props.onlyAvailable"
        type="checkbox"
        class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        @change="emit('update:onlyAvailable', ($event.target as HTMLInputElement).checked)"
      >
      Com saldo
    </label>

    <Botao
      type="submit"
      variant="accent"
      class="h-10 px-4"
      :disabled="props.loading"
    >
      <Search class="h-4 w-4" />
      Buscar
    </Botao>
  </form>
</template>
