<script setup lang="ts">
import { LoaderCircle, Search, SlidersHorizontal } from 'lucide-vue-next'
import Botao from '../Botao.vue'
import Input from '../Input.vue'
import NotaCadastroField from './NotaCadastroField.vue'
import NotaCadastroSection from './NotaCadastroSection.vue'

const props = withDefaults(defineProps<{
  numeroNota: string
  serieNota: string
  chaveNfe: string
  dataCompra: string
  valorTotal: string
  descontoTotal: string
  valorLiquido: string
  observacoes: string
  errors: Record<string, string>
  lookupLoading?: boolean
  lookupMessage?: string
  showAdvancedLookup?: boolean
  advancedCompanyId?: string
}>(), {
  lookupLoading: false,
  lookupMessage: '',
  showAdvancedLookup: false,
  advancedCompanyId: '',
})

const emit = defineEmits<{
  (e: 'update:numeroNota', value: string): void
  (e: 'update:serieNota', value: string): void
  (e: 'update:chaveNfe', value: string): void
  (e: 'update:dataCompra', value: string): void
  (e: 'update:valorTotal', value: string): void
  (e: 'update:descontoTotal', value: string): void
  (e: 'update:valorLiquido', value: string): void
  (e: 'update:observacoes', value: string): void
  (e: 'update:advancedCompanyId', value: string): void
  (e: 'lookupNota'): void
  (e: 'toggleAdvancedLookup'): void
}>()
</script>

<template>
  <NotaCadastroSection eyebrow="Nota fiscal" title="Dados fiscais e valores">
    <div class="grid grid-cols-2 gap-2.5 xl:grid-cols-6">
      <NotaCadastroField label="Numero" :error="props.errors.numero_nota">
        <Input :model-value="props.numeroNota" size="sm" @update:model-value="emit('update:numeroNota', $event)" />
      </NotaCadastroField>

      <NotaCadastroField label="Serie" :error="props.errors.serie_nota">
        <Input
          :model-value="props.serieNota"
          size="sm"
          placeholder="Opcional"
          @update:model-value="emit('update:serieNota', $event)"
        />
      </NotaCadastroField>

      <div class="col-span-2 flex items-end gap-2 xl:col-span-2">
        <Botao
          type="button"
          size="sm"
          variant="primary"
          class="h-9 min-w-0 flex-1"
          :disabled="props.lookupLoading || !props.numeroNota.trim()"
          @click="emit('lookupNota')"
        >
          <LoaderCircle v-if="props.lookupLoading" class="h-4 w-4 animate-spin" />
          <Search v-else class="h-4 w-4" />
          Buscar Integrim
        </Botao>
        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-300"
          :class="props.showAdvancedLookup ? 'border-brand-400 text-brand-700 dark:border-brand-500 dark:text-brand-300' : ''"
          aria-label="Opcoes avancadas"
          title="Opcoes avancadas"
          @click="emit('toggleAdvancedLookup')"
        >
          <SlidersHorizontal class="h-4 w-4" />
        </button>
      </div>

      <NotaCadastroField
        v-if="props.showAdvancedLookup"
        class="col-span-2 xl:col-span-2"
        label="ID empresa"
      >
        <Input
          :model-value="props.advancedCompanyId"
          size="sm"
          inputmode="numeric"
          placeholder="1 a 6"
          @update:model-value="emit('update:advancedCompanyId', $event)"
        />
      </NotaCadastroField>

      <NotaCadastroField class="col-span-2 xl:col-span-2" label="Data da compra" :error="props.errors.data_compra">
        <Input type="date" :model-value="props.dataCompra" size="sm" @update:model-value="emit('update:dataCompra', $event)" />
      </NotaCadastroField>

      <NotaCadastroField class="col-span-2 xl:col-span-2" label="Chave NFe" :error="props.errors.chave_nfe">
        <Input :model-value="props.chaveNfe" placeholder="44 digitos" size="sm" @update:model-value="emit('update:chaveNfe', $event)" />
      </NotaCadastroField>

      <NotaCadastroField class="xl:col-span-2" label="Valor bruto">
        <Input
          :model-value="props.valorTotal"
          size="sm"
          inputmode="decimal"
          placeholder="0,00"
          @update:model-value="emit('update:valorTotal', $event)"
        />
      </NotaCadastroField>

      <NotaCadastroField class="xl:col-span-2" label="Desconto">
        <Input :model-value="props.descontoTotal" placeholder="0,00" size="sm" @update:model-value="emit('update:descontoTotal', $event)" />
      </NotaCadastroField>

      <NotaCadastroField class="col-span-2 xl:col-span-2" label="Valor liquido">
        <Input
          :model-value="props.valorLiquido"
          size="sm"
          inputmode="decimal"
          placeholder="0,00"
          @update:model-value="emit('update:valorLiquido', $event)"
        />
      </NotaCadastroField>

      <NotaCadastroField class="col-span-2 xl:col-span-6" label="Observacoes">
        <textarea
          :value="props.observacoes"
          rows="2"
          class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder="Observacoes"
          @input="emit('update:observacoes', ($event.target as HTMLTextAreaElement).value)"
        />
      </NotaCadastroField>
    </div>

    <p
      v-if="props.lookupMessage"
      class="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
    >
      {{ props.lookupMessage }}
    </p>
  </NotaCadastroSection>
</template>
