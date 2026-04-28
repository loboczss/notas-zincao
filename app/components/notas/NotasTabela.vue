<script setup lang="ts">
import { computed } from 'vue'
import { ReceiptText } from 'lucide-vue-next'
import type { NotaRetiradaListItem } from '../../../shared/types/NotasRetirada'
import NotasCardMobile from './NotasCardMobile.vue'
import NotasEmptyState from './NotasEmptyState.vue'
import NotasStatusBadge from './NotasStatusBadge.vue'

const props = withDefaults(defineProps<{
  notas: NotaRetiradaListItem[]
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'open', notaId: string): void
}>()

const hasNotas = computed(() => props.notas.length > 0)

const formatDate = (value: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
}

const formatCurrency = (value: number | null | undefined) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}
</script>

<template>
  <section class="animate-fade-in">
    <!-- Loading State -->
    <div v-if="props.loading" class="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-8 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <p class="text-xs font-medium">Carregando Notas...</p>
    </div>

    <!-- Empty State -->
    <NotasEmptyState v-else-if="!hasNotas" />

    <!-- List State -->
    <div v-else class="space-y-4">
      <!-- Desktop View -->
      <div class="hidden md:block">
        <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <!-- Header -->
          <div class="grid grid-cols-[100px_1fr_120px_120px_140px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-800/50">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Nº Nota</span>
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Cliente</span>
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Data</span>
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Valor</span>
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Status</span>

          </div>

          <!-- Rows -->
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            <div
              v-for="nota in props.notas"
              :key="nota.id"
              class="group grid grid-cols-[100px_1fr_120px_120px_140px] items-center gap-4 px-6 py-3 transition-colors hover:bg-slate-50 cursor-pointer dark:hover:bg-slate-800/50"
              @click="emit('open', nota.id)"
            >
              <div class="flex flex-col">
                <span class="text-sm font-medium text-slate-900 dark:text-white">{{ nota.serie_nota }}-{{ nota.numero_nota }}</span>
              </div>

              <div class="flex flex-col truncate">
                <span class="truncate text-sm font-medium text-slate-900 dark:text-slate-200">{{ nota.nome_cliente }}</span>
                <span class="text-xs text-slate-500">Série: {{ nota.serie_nota }}</span>
              </div>

              <div class="text-sm text-slate-600 dark:text-slate-400">
                {{ formatDate(nota.data_compra) }}
              </div>

              <div class="text-sm font-medium text-slate-900 dark:text-slate-200">
                {{ formatCurrency(nota.valor_total) }}
              </div>

              <div>
                <NotasStatusBadge :status="nota.status_retirada" />
              </div>


            </div>
          </div>
        </div>
      </div>

      <!-- Mobile View -->
      <div class="grid gap-3 md:hidden">
        <NotasCardMobile
          v-for="nota in props.notas"
          :key="nota.id"
          :nota="nota"
          @open="emit('open', $event)"
        />
      </div>
    </div>
  </section>
</template>
