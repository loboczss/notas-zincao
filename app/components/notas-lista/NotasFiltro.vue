<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <h3 class="text-sm font-semibold text-slate-700">
        Filtros de busca
      </h3>

      <Botao variant="secondary" class="w-full sm:w-auto" @click="limparFiltros">
        Limpar filtros
      </Botao>
    </div>

    <div class="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      <Input
        :model-value="filtro.nome"
        placeholder="Nome do cliente"
        @update:model-value="updateField('nome', $event)"
      />

      <Input
        :model-value="filtro.numero"
        placeholder="Número da nota"
        @update:model-value="updateField('numero', $event)"
      />

      <Input
        :model-value="filtro.data"
        type="date"
        @update:model-value="updateField('data', $event)"
      />

      <Input
        :model-value="filtro.valor"
        type="number"
        step="0.01"
        min="0"
        placeholder="Valor da nota"
        @update:model-value="updateField('valor', $event)"
      />

      <Input
        :model-value="filtro.produto"
        placeholder="Produto"
        @update:model-value="updateField('produto', $event)"
      />
    </div>
  </div>
</template>
