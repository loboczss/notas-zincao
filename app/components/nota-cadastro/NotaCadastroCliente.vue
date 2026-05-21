<script setup lang="ts">
import { LoaderCircle, UserRound } from 'lucide-vue-next'
import type { CrmContato } from '../../../shared/types/CRM'
import Input from '../Input.vue'
import NotaCadastroField from './NotaCadastroField.vue'
import NotaCadastroSection from './NotaCadastroSection.vue'

const props = defineProps<{
  nomeCliente: string
  telefoneCliente: string
  documentoCliente: string
  contatos: CrmContato[]
  loadingSearch?: boolean
  showSuggestions?: boolean
  showNoResults?: boolean
  errors: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'update:nomeCliente', value: string): void
  (e: 'update:telefoneCliente', value: string): void
  (e: 'update:documentoCliente', value: string): void
  (e: 'searchContato', value: string): void
  (e: 'selectContato', contato: CrmContato): void
}>()
</script>

<template>
  <NotaCadastroSection eyebrow="Cliente" title="Dados do cliente">
    <template #icon>
      <UserRound class="h-5 w-5 text-slate-400 dark:text-slate-500" />
    </template>

    <div class="grid grid-cols-2 gap-2.5">
      <NotaCadastroField
        class="col-span-2"
        label="Nome do cliente"
        :error="props.errors.nome_cliente"
        :help="props.showNoResults ? 'Nenhum cliente encontrado. Digite para adicionar manualmente.' : ''"
      >
        <div class="relative">
          <Input
            :model-value="props.nomeCliente"
            placeholder="Buscar cliente"
            size="sm"
            @update:model-value="(value) => { emit('update:nomeCliente', value); emit('searchContato', value) }"
          />

          <div
            v-if="props.showSuggestions || props.loadingSearch"
            class="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-950"
          >
            <div v-if="props.loadingSearch" class="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              <LoaderCircle class="h-4 w-4 animate-spin" />
              Buscando contatos...
            </div>

            <div v-else class="max-h-48 overflow-y-auto p-1.5">
              <button
                v-for="contato in props.contatos"
                :key="contato.contato_id"
                type="button"
                class="flex w-full flex-col rounded-md px-2.5 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                @click="emit('selectContato', contato)"
              >
                <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ contato.nome || contato.contato_id }}</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">{{ contato.contato_id }}</span>
              </button>
            </div>
          </div>
        </div>
      </NotaCadastroField>

      <NotaCadastroField label="Telefone" :error="props.errors.telefone_cliente">
        <Input
          :model-value="props.telefoneCliente"
          placeholder="(00) 00000-0000"
          size="sm"
          @update:model-value="emit('update:telefoneCliente', $event)"
        />
      </NotaCadastroField>

      <NotaCadastroField label="CPF/CNPJ">
        <Input
          :model-value="props.documentoCliente"
          placeholder="Somente numeros"
          size="sm"
          @update:model-value="emit('update:documentoCliente', $event)"
        />
      </NotaCadastroField>
    </div>
  </NotaCadastroSection>
</template>
