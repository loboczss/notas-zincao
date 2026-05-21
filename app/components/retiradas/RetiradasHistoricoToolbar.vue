<script setup lang="ts">
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-vue-next'
import type {
  RetiradaHistoricoSortKey,
  RetiradaHistoricoSortOption,
  RetiradaHistoricoSortOrder,
} from '../../../shared/types/RetiradasHistorico'

const props = defineProps<{
  inicio: number
  fim: number
  total: number
  loading: boolean
  sortKey: RetiradaHistoricoSortKey
  sortOrder: RetiradaHistoricoSortOrder
  sortOptions: RetiradaHistoricoSortOption[]
  sortDescription: string
}>()

const emit = defineEmits<{
  (e: 'sort', key: RetiradaHistoricoSortKey): void
}>()

const sortIcon = (key: RetiradaHistoricoSortKey) => {
  if (props.sortKey !== key) return ArrowUpDown
  return props.sortOrder === 'asc' ? ArrowUp : ArrowDown
}
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div class="space-y-4 p-4 sm:p-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <h2 class="text-base font-bold text-slate-950 dark:text-white">
            Retiradas registradas
          </h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ inicio }}-{{ fim }} de {{ total }} registros
          </p>
          <p class="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Historico por data, cliente, retirado por, itens retirados e impacto no Zinco.
          </p>
        </div>
      </div>

      <div class="space-y-2 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:space-y-0">
        <div class="flex min-w-0 items-center justify-between gap-3 lg:block">
          <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            Ordenar
          </p>
          <p class="text-right text-xs text-slate-500 dark:text-slate-400 lg:hidden">
            {{ sortDescription }}
          </p>
        </div>

        <div class="flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            type="button"
            class="inline-flex h-9 min-w-[74px] shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            :class="sortKey === option.key ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
            :disabled="loading"
            :title="option.description"
            @click="emit('sort', option.key)"
          >
            <component :is="sortIcon(option.key)" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ option.label }}</span>
          </button>
        </div>

        <p class="hidden shrink-0 text-xs text-slate-500 dark:text-slate-400 lg:block">
          {{ sortDescription }}
        </p>
      </div>
    </div>
  </section>
</template>
