<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Botao from '../Botao.vue'
import ListaTabelasGlobal from '../ListaTabelasGlobal.vue'
import type { NotaRetiradaListItem } from '../../../shared/types/NotasRetirada'

const props = defineProps<{
  refreshKey?: number
}>()

const carregando = ref(false)
const erro = ref('')
const notas = ref<NotaRetiradaListItem[]>([])

const colunasTabela = [
  { key: 'nome_cliente', label: 'Cliente' },
  { key: 'numero_nota', label: 'Nº nota' },
  { key: 'serie_nota', label: 'Série' },
  { key: 'data_compra', label: 'Data compra' },
  { key: 'valor_total', label: 'Valor total' },
  { key: 'status_retirada', label: 'Status' },
]

const formatCurrency = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '-'
  }

  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('pt-BR')
}

const linhasTabela = computed(() => {
  return notas.value.map(item => ({
    nome_cliente: item.nome_cliente,
    numero_nota: item.numero_nota,
    serie_nota: item.serie_nota,
    data_compra: formatDate(item.data_compra),
    valor_total: formatCurrency(item.valor_total),
    status_retirada: item.status_retirada,
  }))
})

const carregarNotas = async () => {
  carregando.value = true
  erro.value = ''

  try {
    const data = await $fetch<{
      success: boolean
      notas: NotaRetiradaListItem[]
    }>('/api/notas/list')

    notas.value = data.notas || []
  }
  catch (error) {
    erro.value = error instanceof Error ? error.message : 'Falha ao carregar notas.'
  }
  finally {
    carregando.value = false
  }
}

watch(() => props.refreshKey, () => {
  carregarNotas()
})

onMounted(() => {
  carregarNotas()
})
</script>

<template>
  <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-semibold text-slate-900">
        Lista de notas cadastradas
      </h2>

      <Botao variant="secondary" :disabled="carregando" @click="carregarNotas">
        {{ carregando ? 'Atualizando...' : 'Atualizar lista' }}
      </Botao>
    </div>

    <p v-if="erro" class="mt-4 text-sm font-medium text-red-600">
      {{ erro }}
    </p>

    <p v-else-if="carregando" class="mt-4 text-sm text-slate-600">
      Carregando notas...
    </p>

    <div v-else class="mt-4">
      <ListaTabelasGlobal :columns="colunasTabela" :rows="linhasTabela" empty-text="Nenhuma nota cadastrada." />
    </div>
  </section>
</template>
