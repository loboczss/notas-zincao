<script setup lang="ts">
import { computed, ref } from 'vue'
import { Filter, X, ChevronDown } from 'lucide-vue-next'
import Botao from '../Botao.vue'
import Input from '../Input.vue'

export type NotasFiltroState = {
  nome: string
  numero: string
  data: string
  valor: string
  produto: string
}

const props = withDefaults(defineProps<{
  modelValue?: NotasFiltroState
}>(), {
  modelValue: () => ({
    nome: '',
    numero: '',
    data: '',
    valor: '',
    produto: '',
  }),
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: NotasFiltroState): void
}>()

const isExpanded = ref(false)

const filtro = computed({
  get: () => props.modelValue,
  set: (value: NotasFiltroState) => emit('update:modelValue', value),
})

const updateField = (field: keyof NotasFiltroState, value: string) => {
  filtro.value = {
    ...filtro.value,
    [field]: value,
  }
}

const limparFiltros = () => {
  filtro.value = {
    nome: '',
    numero: '',
    data: '',
    valor: '',
    produto: '',
  }
}

const isFilterActive = computed(() => {
  return Object.values(filtro.value).some(v => v !== '')
})
</script>

<template>
  <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors duration-300">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between cursor-pointer" @click="isExpanded = !isExpanded">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          <Filter class="h-4 w-4" />
        </div>
        <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">
          Pesquisa Integrada
        </h3>
        <span v-if="isFilterActive" class="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
          !
        </span>
      </div>

      <div class="flex items-center gap-3">
        <button 
          v-if="isFilterActive"
          @click.stop="limparFiltros"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
        >
          <X class="h-3.5 w-3.5" />
          Limpar
        </button>
        <button class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800">
          <ChevronDown class="h-4 w-4 transition-transform duration-300" :class="{ 'rotate-180': isExpanded }" />
        </button>
      </div>
    </div>

    <div v-show="isExpanded" class="mt-4 grid gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 md:grid-cols-2 lg:grid-cols-5">
      <Input
        :model-value="filtro.nome"
        placeholder="Nome do cliente"
        class="bg-slate-50/50 dark:bg-slate-800/50"
        @update:model-value="updateField('nome', $event)"
      />

      <Input
        :model-value="filtro.numero"
        placeholder="Nº da NF"
        class="bg-slate-50/50 dark:bg-slate-800/50"
        @update:model-value="updateField('numero', $event)"
      />

      <Input
        :model-value="filtro.data"
        type="date"
        class="bg-slate-50/50 dark:bg-slate-800/50"
        @update:model-value="updateField('data', $event)"
      />

      <Input
        :model-value="filtro.valor"
        type="number"
        step="0.01"
        min="0"
        placeholder="R$ Valor Exato"
        class="bg-slate-50/50 dark:bg-slate-800/50"
        @update:model-value="updateField('valor', $event)"
      />

      <Input
        :model-value="filtro.produto"
        placeholder="Código ou Produto"
        class="bg-slate-50/50 dark:bg-slate-800/50"
        @update:model-value="updateField('produto', $event)"
      />
    </div>
  </div>
</template>
