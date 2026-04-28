<script setup lang="ts">
import Input from '../Input.vue'

const props = defineProps<{
  numeroNota: string
  serieNota: string
  chaveNfe: string
  dataCompra: string
  valorTotal: string
  descontoTotal: string
  valorLiquido: string
  observacoes: string
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'update:numeroNota', value: string): void
  (e: 'update:serieNota', value: string): void
  (e: 'update:chaveNfe', value: string): void
  (e: 'update:dataCompra', value: string): void
  (e: 'update:descontoTotal', value: string): void
  (e: 'update:observacoes', value: string): void
}>()
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Nota fiscal</p>
    <h2 class="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Dados fiscais e valores</h2>

    <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Número da nota</label>
        <Input :model-value="props.numeroNota" @update:model-value="emit('update:numeroNota', $event)" />
        <p v-if="props.errors.numero_nota" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ props.errors.numero_nota }}</p>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Série</label>
        <Input :model-value="props.serieNota" @update:model-value="emit('update:serieNota', $event)" />
        <p v-if="props.errors.serie_nota" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ props.errors.serie_nota }}</p>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Data da compra</label>
        <Input type="date" :model-value="props.dataCompra" @update:model-value="emit('update:dataCompra', $event)" />
        <p v-if="props.errors.data_compra" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ props.errors.data_compra }}</p>
      </div>

      <div class="md:col-span-2 xl:col-span-3">
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Chave NFe</label>
        <Input :model-value="props.chaveNfe" placeholder="44 dígitos" @update:model-value="emit('update:chaveNfe', $event)" />
        <p v-if="props.errors.chave_nfe" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ props.errors.chave_nfe }}</p>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Valor bruto</label>
        <Input :model-value="props.valorTotal" disabled />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Desconto</label>
        <Input :model-value="props.descontoTotal" placeholder="0,00" @update:model-value="emit('update:descontoTotal', $event)" />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Valor líquido</label>
        <Input :model-value="props.valorLiquido" disabled />
      </div>

      <div class="md:col-span-2 xl:col-span-3">
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Observações</label>
        <textarea
          :value="props.observacoes"
          rows="3"
          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          placeholder="Avisos da IA, conferências e observações adicionais"
          @input="emit('update:observacoes', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>
  </section>
</template>
