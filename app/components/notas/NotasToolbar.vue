<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, FileDown, Loader2, RotateCw, Search, SlidersHorizontal } from 'lucide-vue-next'
import type { NotaRetiradaStatus } from '../../../shared/types/NotasRetirada'

const props = withDefaults(defineProps<{
  searchTerm: string
  statusFilter: 'todos' | NotaRetiradaStatus
  dataInicio: string
  dataFim: string
  totalCount: number
  resultCount: number
  loading?: boolean
  exportLoading?: 'csv' | 'pdf' | false
}>(), {
  loading: false,
  exportLoading: false,
})

const emit = defineEmits<{
  (e: 'update:searchTerm', value: string): void
  (e: 'update:statusFilter', value: 'todos' | NotaRetiradaStatus): void
  (e: 'update:dataInicio', value: string): void
  (e: 'update:dataFim', value: string): void
  (e: 'apply'): void
  (e: 'refresh'): void
  (e: 'export', format: 'csv' | 'pdf'): void
}>()

const advancedOpen = ref(false)

const hasAdvancedFilters = computed(() => {
  return props.statusFilter !== 'todos'
    || Boolean(props.dataInicio)
    || Boolean(props.dataFim)
})
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
    <div class="flex flex-col gap-4">
      <div class="grid gap-3 md:flex md:items-start md:justify-between">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Filtros</h2>
        </div>

        <div class="flex flex-wrap items-center gap-2 md:justify-end">
          <div class="rounded-md bg-slate-50 px-2.5 py-1 text-xs text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
            Resultados:
            <span class="font-medium text-slate-900 dark:text-white">{{ props.resultCount }}</span>
            de {{ props.totalCount }}
          </div>

          <Botao
            type="button"
            variant="secondary"
            size="sm"
            :class="hasAdvancedFilters ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300' : ''"
            aria-controls="notas-filtros-avancados"
            :aria-expanded="advancedOpen"
            @click="advancedOpen = !advancedOpen"
          >
            <SlidersHorizontal class="h-3.5 w-3.5" />
            <span>{{ advancedOpen ? 'Ocultar' : 'Mais filtros' }}</span>
            <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': advancedOpen }" />
          </Botao>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Buscar</label>
        <div class="relative">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search class="h-4 w-4 text-slate-400" />
          </div>
          <Input
            :model-value="props.searchTerm"
            type="text"
            placeholder="Nome, numero ou serie..."
            class="pl-9"
            @update:model-value="emit('update:searchTerm', $event)"
            @keyup.enter="emit('apply')"
          />
        </div>
      </div>

      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="-translate-y-1 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-1 opacity-0"
      >
        <div
          v-if="advancedOpen"
          id="notas-filtros-avancados"
          class="border-t border-slate-200 pt-4 dark:border-slate-800"
        >
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Status</label>
              <div class="relative">
                <SelectInput
                  :model-value="props.statusFilter"
                  class="appearance-none pr-8"
                  @update:model-value="emit('update:statusFilter', $event as 'todos' | NotaRetiradaStatus)"
                >
                  <option value="todos">Todos Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="parcial">Parciais</option>
                  <option value="retirada">Concluidas</option>
                  <option value="cancelada">Canceladas</option>
                </SelectInput>
                <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <ChevronDown class="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Data Inicial</label>
              <Input
                :model-value="props.dataInicio"
                type="date"
                @update:model-value="emit('update:dataInicio', $event)"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-medium text-slate-700 dark:text-slate-300">Data Final</label>
              <Input
                :model-value="props.dataFim"
                type="date"
                @update:model-value="emit('update:dataFim', $event)"
              />
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Botao
              type="button"
              class="w-full sm:w-auto"
              :disabled="props.loading"
              @click="emit('apply')"
            >
              <Loader2 v-if="props.loading" class="h-4 w-4 animate-spin" />
              <span>Filtrar</span>
            </Botao>

            <div class="flex w-full items-center gap-2 sm:w-auto">
              <IconButton
                label="Atualizar"
                :disabled="props.loading"
                @click="emit('refresh')"
              >
                <RotateCw class="h-4 w-4" :class="props.loading ? 'animate-spin' : ''" />
              </IconButton>

              <div class="hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

              <Botao
                type="button"
                variant="secondary"
                class="flex-1 sm:flex-none"
                :disabled="!!props.exportLoading"
                @click="emit('export', 'csv')"
              >
                <Loader2 v-if="props.exportLoading === 'csv'" class="h-4 w-4 animate-spin" />
                <FileDown v-else class="h-4 w-4" />
                <span>CSV</span>
              </Botao>

              <Botao
                type="button"
                variant="secondary"
                class="flex-1 sm:flex-none"
                :disabled="!!props.exportLoading"
                @click="emit('export', 'pdf')"
              >
                <Loader2 v-if="props.exportLoading === 'pdf'" class="h-4 w-4 animate-spin" />
                <FileDown v-else class="h-4 w-4" />
                <span>PDF</span>
              </Botao>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
