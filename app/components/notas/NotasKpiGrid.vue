<script setup lang="ts">
import { CheckCircle2, Layers3, Package } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  total?: number
  pendentes?: number
  parciais?: number
  concluidas?: number
  zincoDisponivel: number
  zincoOnly?: boolean
}>(), {
  total: 0,
  pendentes: 0,
  parciais: 0,
  concluidas: 0,
  zincoOnly: false,
})

const formatDecimal = (value: number) => {
  const hasFraction = Math.abs(value - Math.trunc(value)) > 0.000001

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: hasFraction ? 1 : 0,
  }).format(value)
}
</script>

<template>
  <div
    class="grid gap-4"
    :class="props.zincoOnly ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-5'"
  >
    <div v-if="!props.zincoOnly" class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center gap-2">
        <Package class="h-4 w-4 text-slate-400" />
        <span class="text-xs font-medium text-slate-500">Total Geral</span>
      </div>
      <div class="mt-2 flex items-baseline">
        <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ props.total }}</span>
      </div>
    </div>

    <div v-if="!props.zincoOnly" class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-brand-500" />
        <span class="text-xs font-medium text-slate-500">Pendentes</span>
      </div>
      <div class="mt-2 flex items-baseline">
        <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ props.pendentes }}</span>
      </div>
    </div>

    <div v-if="!props.zincoOnly" class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-blue-500" />
        <span class="text-xs font-medium text-slate-500">Parciais</span>
      </div>
      <div class="mt-2 flex items-baseline">
        <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ props.parciais }}</span>
      </div>
    </div>

    <div v-if="!props.zincoOnly" class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center gap-2">
        <CheckCircle2 class="h-4 w-4 text-emerald-500" />
        <span class="text-xs font-medium text-slate-500">Concluídas</span>
      </div>
      <div class="mt-2 flex items-baseline">
        <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ props.concluidas }}</span>
      </div>
    </div>

    <div
      class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      :class="props.zincoOnly ? '' : 'col-span-2 md:col-span-1'"
    >
      <div class="flex items-center gap-2">
        <Layers3 class="h-4 w-4 text-amber-500" />
        <span class="text-xs font-medium text-slate-500">Zinco disponivel</span>
      </div>
      <div class="mt-2 flex items-baseline gap-1">
        <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatDecimal(props.zincoDisponivel) }}</span>
        <span class="text-xs font-medium text-slate-400">m2</span>
      </div>
    </div>
  </div>
</template>
