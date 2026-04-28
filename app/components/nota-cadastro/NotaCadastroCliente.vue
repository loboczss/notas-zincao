<script setup lang="ts">
import { LoaderCircle, Search, UserRound } from 'lucide-vue-next'
import type { CrmContato } from '../../../shared/types/CRM'
import Input from '../Input.vue'

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
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cliente</p>
        <h2 class="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Dados do cliente</h2>
      </div>
      <UserRound class="mt-1 h-5 w-5 text-slate-400 dark:text-slate-500" />
    </div>

    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Nome do cliente</label>
        <div class="relative">
          <div class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search class="h-4 w-4" />
          </div>
          <Input
            :model-value="props.nomeCliente"
            placeholder="Digite para buscar..."
            class="pl-9"
            @update:model-value="(value) => { emit('update:nomeCliente', value); emit('searchContato', value) }"
          />

          <div
            v-if="props.showSuggestions || props.loadingSearch"
            class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-950"
          >
            <div v-if="props.loadingSearch" class="flex items-center gap-2 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              <LoaderCircle class="h-4 w-4 animate-spin" />
              Buscando contatos...
            </div>

            <div v-else class="max-h-56 overflow-y-auto p-2">
              <button
                v-for="contato in props.contatos"
                :key="contato.contato_id"
                type="button"
                class="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                @click="emit('selectContato', contato)"
              >
                <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ contato.nome || contato.contato_id }}</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">{{ contato.contato_id }}</span>
              </button>
            </div>
          </div>
        </div>
        <p v-if="props.showNoResults" class="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
          Nenhum cliente encontrado. Digite para adicionar manualmente.
        </p>
        <p v-if="props.errors.nome_cliente" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ props.errors.nome_cliente }}</p>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Telefone</label>
        <Input :model-value="props.telefoneCliente" placeholder="(00) 00000-0000" @update:model-value="emit('update:telefoneCliente', $event)" />
        <p v-if="props.errors.telefone_cliente" class="mt-1 text-xs text-rose-600 dark:text-rose-400">{{ props.errors.telefone_cliente }}</p>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">CPF/CNPJ</label>
        <Input :model-value="props.documentoCliente" placeholder="Somente números" @update:model-value="emit('update:documentoCliente', $event)" />
      </div>
    </div>
  </section>
</template>
