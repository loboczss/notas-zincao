<script setup lang="ts">
import Input from '../Input.vue'
import NotaCadastroField from './NotaCadastroField.vue'
import NotaCadastroSection from './NotaCadastroSection.vue'

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
  <NotaCadastroSection eyebrow="Nota fiscal" title="Dados fiscais e valores">
    <div class="grid grid-cols-2 gap-2.5 xl:grid-cols-6">
      <NotaCadastroField label="Numero" :error="props.errors.numero_nota">
        <Input :model-value="props.numeroNota" size="sm" @update:model-value="emit('update:numeroNota', $event)" />
      </NotaCadastroField>

      <NotaCadastroField label="Serie" :error="props.errors.serie_nota">
        <Input :model-value="props.serieNota" size="sm" @update:model-value="emit('update:serieNota', $event)" />
      </NotaCadastroField>

      <NotaCadastroField class="col-span-2 xl:col-span-2" label="Data da compra" :error="props.errors.data_compra">
        <Input type="date" :model-value="props.dataCompra" size="sm" @update:model-value="emit('update:dataCompra', $event)" />
      </NotaCadastroField>

      <NotaCadastroField class="col-span-2 xl:col-span-2" label="Chave NFe" :error="props.errors.chave_nfe">
        <Input :model-value="props.chaveNfe" placeholder="44 digitos" size="sm" @update:model-value="emit('update:chaveNfe', $event)" />
      </NotaCadastroField>

      <NotaCadastroField class="xl:col-span-2" label="Valor bruto">
        <Input :model-value="props.valorTotal" size="sm" disabled />
      </NotaCadastroField>

      <NotaCadastroField class="xl:col-span-2" label="Desconto">
        <Input :model-value="props.descontoTotal" placeholder="0,00" size="sm" @update:model-value="emit('update:descontoTotal', $event)" />
      </NotaCadastroField>

      <NotaCadastroField class="col-span-2 xl:col-span-2" label="Valor liquido">
        <Input :model-value="props.valorLiquido" size="sm" disabled />
      </NotaCadastroField>

      <NotaCadastroField class="col-span-2 xl:col-span-6" label="Observacoes">
        <textarea
          :value="props.observacoes"
          rows="2"
          class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder="Avisos da IA e observacoes"
          @input="emit('update:observacoes', ($event.target as HTMLTextAreaElement).value)"
        />
      </NotaCadastroField>
    </div>
  </NotaCadastroSection>
</template>
