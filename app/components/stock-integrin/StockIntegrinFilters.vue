<script setup lang="ts">
import { computed } from 'vue'
import { Search } from 'lucide-vue-next'

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

    <SelectInput
      :model-value="props.idempresa"
      aria-label="Empresa"
      @update:model-value="emit('update:idempresa', $event)"
    >
      <option value="">Todas empresas</option>
      <option v-for="empresa in companyOptions" :key="empresa" :value="String(empresa)">
        Empresa {{ empresa }}
      </option>
    </SelectInput>

    <CheckboxField
      :model-value="props.onlyAvailable"
      @update:model-value="emit('update:onlyAvailable', $event)"
    >
      Com saldo
    </CheckboxField>

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
