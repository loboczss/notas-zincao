<script setup lang="ts">
import { HelpCircle } from 'lucide-vue-next'
import type { IntegrimProdutoValor } from '../../../shared/types/IntegrimNotas'
import PrevisaoComprasProductCard from './PrevisaoComprasProductCard.vue'
import PageEmptyState from '../PageEmptyState.vue'

const props = withDefaults(defineProps<{
  produtos: IntegrimProdutoValor[]
  loadingInitial?: boolean
  isAdmin?: boolean
}>(), {
  loadingInitial: false,
  isAdmin: false,
})

const emit = defineEmits<{
  (e: 'select', produto: IntegrimProdutoValor): void
}>()
</script>

<template>
  <div class="space-y-4">
    <!-- Estado de Carregamento Inicial (Skeletons em formato de Tabela) -->
    <div v-if="props.loadingInitial" class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40" aria-busy="true">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
          <thead class="bg-slate-50 text-xs font-bold uppercase text-slate-400 dark:bg-slate-900/60 dark:text-slate-500">
            <tr>
              <th class="px-4 py-3">Produto / Identificação</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-right">Giro / Dia</th>
              <th class="px-4 py-3 text-right">Estoque</th>
              <th class="px-4 py-3 text-right">Cobertura</th>
              <th class="px-4 py-3 text-right">Comprar</th>
              <th class="px-4 py-3 text-right">Faturamento 12m</th>
              <th class="px-4 py-3 text-right">Lucro 12m</th>
              <th class="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="i in 5" :key="i" class="animate-pulse">
              <td class="px-4 py-3.5">
                <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6 mb-1" />
                <div class="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </td>
              <td class="px-4 py-3.5"><div class="h-4.5 bg-slate-100 dark:bg-slate-800 rounded w-14 mx-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-150 dark:bg-slate-800 rounded w-10 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-150 dark:bg-slate-800 rounded w-12 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-150 dark:bg-slate-800 rounded w-16 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-5 bg-slate-150 dark:bg-slate-800 rounded w-12 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-150 dark:bg-slate-800 rounded w-20 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-150 dark:bg-slate-800 rounded w-20 ml-auto" /></td>
              <td class="px-4 py-3.5"><div class="h-4 bg-slate-150 dark:bg-slate-800 rounded w-10 ml-auto" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Estado de Lista Vazia -->
    <PageEmptyState
      v-else-if="!props.produtos.length"
      title="Nenhum produto analisado"
      :description="props.isAdmin 
        ? 'Use o botão \'Sincronizar\' acima para buscar as notas do Integrim e processar a análise.' 
        : 'Não há dados de previsão gerados no momento. Aguarde a sincronização executada por um administrador.'"
    >
      <template #icon>
        <HelpCircle class="h-6 w-6" />
      </template>
    </PageEmptyState>

    <!-- Tabela Real de Dados -->
    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100 text-left text-sm dark:divide-slate-800">
          <thead class="bg-slate-50 text-xs font-bold uppercase text-slate-400 dark:bg-slate-900/60 dark:text-slate-500">
            <tr>
              <th class="px-4 py-3">Produto / Identificação</th>
              <th class="px-4 py-3 text-center">Status</th>
              <th class="px-4 py-3 text-right">Giro / Dia</th>
              <th class="px-4 py-3 text-right">Estoque</th>
              <th class="px-4 py-3 text-right">Cobertura</th>
              <th class="px-4 py-3 text-right">Comprar</th>
              <th class="px-4 py-3 text-right">Faturamento 12m</th>
              <th class="px-4 py-3 text-right">Lucro 12m</th>
              <th class="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <PrevisaoComprasProductCard
              v-for="produto in props.produtos"
              :key="produto.id"
              :produto="produto"
              @select="emit('select', $event)"
            />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
