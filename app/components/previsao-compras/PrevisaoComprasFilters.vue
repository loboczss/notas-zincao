<script setup lang="ts">
import { computed } from 'vue'
import { Search, SlidersHorizontal } from 'lucide-vue-next'
import type { IntegrimProdutoValorSort } from '../../../shared/types/IntegrimNotas'
import Input from '../Input.vue'
import SelectInput from '../SelectInput.vue'
import Botao from '../Botao.vue'

const props = withDefaults(defineProps<{
  searchTerm: string
  idempresa: string
  sort: IntegrimProdutoValorSort
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:searchTerm', value: string): void
  (e: 'update:idempresa', value: string): void
  (e: 'update:sort', value: IntegrimProdutoValorSort): void
  (e: 'apply'): void
}>()

const empresasDisponiveis = [1, 2, 3, 4, 5, 6]
const sortOptions: Array<{ value: IntegrimProdutoValorSort, label: string }> = [
  { value: 'score_valor', label: 'Mais importantes (score)' },
  { value: 'faturamento_365d', label: 'Maior faturamento' },
  { value: 'margem_365d', label: 'Maior lucro' },
  { value: 'qtd_365d', label: 'Mais vendidos (unidades)' },
  { value: 'giro_diario', label: 'Maior giro (venda/dia)' },
  { value: 'dias_cobertura', label: 'Perto de acabar primeiro' },
  { value: 'sugestao_compra', label: 'Maior sugestão de compra' },
]

const handleSearchSubmit = () => {
  emit('apply')
}
</script>

<template>
  <form
    class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 md:grid-cols-[1fr_auto_auto_auto] items-end"
    @submit.prevent="handleSearchSubmit"
  >
    <!-- Busca -->
    <div class="flex flex-col gap-1.5 w-full">
      <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Buscar produto</span>
      <div class="relative w-full">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          :model-value="props.searchTerm"
          type="search"
          placeholder="Descrição ou código do produto..."
          class="h-10 pl-9"
          @update:model-value="emit('update:searchTerm', $event)"
        />
      </div>
    </div>

    <!-- Empresa -->
    <div class="flex flex-col gap-1.5 min-w-[160px]">
      <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Empresa</span>
      <SelectInput
        :model-value="props.idempresa"
        class="h-10"
        @update:model-value="emit('update:idempresa', $event); emit('apply')"
      >
        <option value="">Todas</option>
        <option v-for="emp in empresasDisponiveis" :key="emp" :value="String(emp)">Empresa {{ emp }}</option>
      </SelectInput>
    </div>

    <!-- Ordenação -->
    <div class="flex flex-col gap-1.5 min-w-[220px]">
      <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ordenar por</span>
      <SelectInput
        :model-value="props.sort"
        class="h-10"
        @update:model-value="emit('update:sort', $event as IntegrimProdutoValorSort); emit('apply')"
      >
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </SelectInput>
    </div>

    <!-- Botão Buscar -->
    <Botao
      type="submit"
      variant="accent"
      class="h-10 px-5 font-semibold shrink-0"
      :disabled="props.loading"
    >
      <SlidersHorizontal class="h-4 w-4" />
      Filtrar
    </Botao>
  </form>
</template>
