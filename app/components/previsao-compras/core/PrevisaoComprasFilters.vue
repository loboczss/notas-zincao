<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, Search, SlidersHorizontal, Sparkles, X } from 'lucide-vue-next'
import type {
  IntegrimProdutoOportunidadeFilter,
  IntegrimProdutoValorSort,
} from '../../../../shared/types/IntegrimNotas'
import Input from '../../Input.vue'
import SelectInput from '../../SelectInput.vue'
import Botao from '../../Botao.vue'

const props = withDefaults(defineProps<{
  searchTerm: string
  idempresa: string
  sort: IntegrimProdutoValorSort
  periodPreset: string
  dateStart: string
  dateEnd: string
  coverageDays: string
  comparePrevious: boolean
  oportunidadeFilter: IntegrimProdutoOportunidadeFilter
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:searchTerm', value: string): void
  (e: 'update:idempresa', value: string): void
  (e: 'update:sort', value: IntegrimProdutoValorSort): void
  (e: 'update:periodPreset', value: string): void
  (e: 'update:dateStart', value: string): void
  (e: 'update:dateEnd', value: string): void
  (e: 'update:coverageDays', value: string): void
  (e: 'update:comparePrevious', value: boolean): void
  (e: 'update:oportunidadeFilter', value: IntegrimProdutoOportunidadeFilter): void
  (e: 'quickPeriod', days: number): void
  (e: 'apply'): void
}>()

const empresasDisponiveis = [1, 2, 3, 4, 5, 6]
const showAdvancedFilters = ref(false)

const sortOptions: Array<{ value: IntegrimProdutoValorSort, label: string }> = [
  { value: 'score_valor', label: 'Mais importantes (score)' },
  { value: 'faturamento_periodo', label: 'Maior faturamento no período' },
  { value: 'margem_periodo', label: 'Maior lucro no período' },
  { value: 'qtd_periodo', label: 'Mais vendidos no período' },
  { value: 'giro_diario', label: 'Maior giro (venda/dia)' },
  { value: 'dias_cobertura', label: 'Perto de acabar primeiro' },
  { value: 'sugestao_compra', label: 'Maior sugestão de compra' },
  { value: 'oportunidade_ia', label: 'Maior oportunidade IA' },
]

const periodPresetOptions = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '15', label: 'Últimos 15 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 180 dias' },
  { value: '365', label: 'Último ano (365d)' },
  { value: 'custom', label: 'Período Personalizado' },
]

const oportunidadeOptions: Array<{ value: IntegrimProdutoOportunidadeFilter, label: string }> = [
  { value: 'all', label: 'Todas as Oportunidades' },
  { value: 'calculo', label: 'Somente pelo Cálculo' },
  { value: 'ia', label: 'Somente pela IA' },
  { value: 'ambos', label: 'Ambos (Cálculo + IA)' },
]

const activeAdvancedCount = computed(() => {
  let count = 0
  if (props.coverageDays !== '45') count++
  if (props.oportunidadeFilter !== 'all') count++
  if (!props.comparePrevious) count++
  if (props.periodPreset === 'custom') count++
  return count
})

const handlePeriodPresetChange = (value: string) => {
  emit('update:periodPreset', value)
  if (value !== 'custom') {
    emit('quickPeriod', Number(value))
    emit('apply')
  }
}
</script>

<template>
  <form
    class="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
    @submit.prevent="emit('apply')"
  >
    <!-- Linha Principal: Filtros Mais Utilizados -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr_auto] items-end">
      
      <!-- Buscar Produto -->
      <div class="flex flex-col gap-1.5 w-full">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Buscar produto</span>
        <div class="relative w-full">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            :model-value="props.searchTerm"
            type="search"
            placeholder="Descrição ou código do produto..."
            class="h-10 pl-9 pr-8 text-xs"
            @update:model-value="emit('update:searchTerm', $event)"
          />
          <button
            v-if="props.searchTerm"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            @click="emit('update:searchTerm', ''); emit('apply')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Empresa -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Empresa</span>
        <SelectInput
          :model-value="props.idempresa"
          class="h-10 text-xs"
          @update:model-value="emit('update:idempresa', $event); emit('apply')"
        >
          <option value="">Todas as Empresas</option>
          <option v-for="emp in empresasDisponiveis" :key="emp" :value="String(emp)">Empresa {{ emp }}</option>
        </SelectInput>
      </div>

      <!-- Período Preset -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Período de Análise</span>
        <SelectInput
          :model-value="props.periodPreset"
          class="h-10 text-xs"
          @update:model-value="handlePeriodPresetChange($event)"
        >
          <option v-for="opt in periodPresetOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </SelectInput>
      </div>

      <!-- Ordenar Por -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Ordenar por</span>
        <SelectInput
          :model-value="props.sort"
          class="h-10 text-xs"
          @update:model-value="emit('update:sort', $event as IntegrimProdutoValorSort); emit('apply')"
        >
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </SelectInput>
      </div>

      <!-- Ações: Filtrar e Opções Avançadas -->
      <div class="flex items-center gap-2 h-10">
        <button
          type="button"
          class="h-10 px-3.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition select-none shrink-0 relative"
          :class="showAdvancedFilters || activeAdvancedCount > 0
            ? 'border-brand-500 bg-brand-50 text-brand-900 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900'"
          @click="showAdvancedFilters = !showAdvancedFilters"
        >
          <SlidersHorizontal class="h-4 w-4" />
          <span>Filtros</span>
          <span
            v-if="activeAdvancedCount > 0"
            class="px-1.5 py-0.5 text-[10px] leading-none font-extrabold rounded-full bg-brand-500 text-slate-950 dark:bg-brand-400"
          >
            {{ activeAdvancedCount }}
          </span>
        </button>
        <Botao
          type="submit"
          variant="accent"
          class="h-10 px-5 font-semibold text-xs shrink-0 flex items-center gap-1"
          :disabled="props.loading"
        >
          Filtrar
        </Botao>
      </div>

    </div>

    <!-- Linha Secundária: Filtros Personalizados ou Avançados (Drawer) -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="transform opacity-0 -translate-y-2 max-h-0 overflow-hidden"
      enter-to-class="transform opacity-100 translate-y-0 max-h-[500px]"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="transform opacity-100 translate-y-0 max-h-[500px]"
      leave-to-class="transform opacity-0 -translate-y-2 max-h-0 overflow-hidden"
    >
      <div
        v-show="showAdvancedFilters || props.periodPreset === 'custom'"
        class="grid gap-3 grid-cols-2 md:grid-cols-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 dark:bg-slate-950/5 p-3 rounded-lg space-y-0"
      >
        <!-- Data Inicial (Aparece apenas quando Período é Personalizado) -->
        <div v-if="props.periodPreset === 'custom'" class="flex flex-col gap-1.5 animate-fade-in">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Data Inicial</span>
          <Input
            :model-value="props.dateStart"
            type="date"
            class="h-10 text-xs"
            @update:model-value="emit('update:dateStart', $event)"
          />
        </div>

        <!-- Data Final (Aparece apenas quando Período é Personalizado) -->
        <div v-if="props.periodPreset === 'custom'" class="flex flex-col gap-1.5 animate-fade-in">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Data Final</span>
          <Input
            :model-value="props.dateEnd"
            type="date"
            class="h-10 text-xs"
            @update:model-value="emit('update:dateEnd', $event)"
          />
        </div>

        <!-- Cobertura de Estoque (Filtro Avançado) -->
        <div v-show="showAdvancedFilters" class="flex flex-col gap-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Dias de Cobertura</span>
          <Input
            :model-value="props.coverageDays"
            type="number"
            min="1"
            max="365"
            step="1"
            class="h-10 text-xs"
            @update:model-value="emit('update:coverageDays', $event)"
          />
        </div>

        <!-- Oportunidades IA (Filtro Avançado) -->
        <div v-show="showAdvancedFilters" class="flex flex-col gap-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Oportunidades IA</span>
          <SelectInput
            :model-value="props.oportunidadeFilter"
            class="h-10 text-xs"
            @update:model-value="emit('update:oportunidadeFilter', $event as IntegrimProdutoOportunidadeFilter); emit('apply')"
          >
            <option v-for="opt in oportunidadeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </SelectInput>
        </div>

        <!-- Comparar Período Anterior (Filtro Avançado com Toggle Switch) -->
        <div v-show="showAdvancedFilters" class="flex flex-col gap-1.5 justify-end">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Comparação</span>
          <button
            type="button"
            class="flex h-10 w-full items-center justify-between rounded-lg border px-3 text-xs font-semibold transition cursor-pointer select-none"
            :class="props.comparePrevious
              ? 'border-brand-500 bg-brand-50/50 text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/5 dark:text-brand-300'
              : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'"
            @click="emit('update:comparePrevious', !props.comparePrevious); emit('apply')"
          >
            <span class="flex items-center gap-2">
              <CalendarDays class="h-4 w-4 text-slate-400" />
              Comparar anterior
            </span>
            <span
              class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
              :class="props.comparePrevious ? 'bg-brand-500 dark:bg-brand-400' : 'bg-slate-200 dark:bg-slate-800'"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="props.comparePrevious ? 'translate-x-4' : 'translate-x-0'"
              />
            </span>
          </button>
        </div>

      </div>
    </transition>
  </form>
</template>
