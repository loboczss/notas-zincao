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
    <div v-if="props.loading" class="glass-card flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[40px] border p-8 text-slate-500 dark:border-white/5 dark:text-slate-400">
      <div class="relative flex h-12 w-12 items-center justify-center">
        <div class="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
      <p class="text-xs font-bold uppercase tracking-widest">Carregando Notas...</p>
    </div>

    <!-- Empty State -->
    <NotasEmptyState v-else-if="!hasNotas" />

    <!-- List State -->
    <div v-else class="space-y-4">
      <!-- Desktop View -->
      <div class="hidden flex-col gap-3 md:flex">
        <!-- Header -->
        <div class="grid grid-cols-[100px_1fr_120px_120px_140px_120px] items-center gap-4 px-8 pb-2">
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Nº Nota</span>
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Cliente</span>
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Data</span>
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Valor</span>
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Status</span>
          <span class="text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Ação</span>
        </div>

        <!-- Rows -->
        <div
          v-for="nota in props.notas"
          :key="nota.id"
          class="glass-card group relative grid grid-cols-[100px_1fr_120px_120px_140px_120px] items-center gap-4 rounded-3xl border border-dotted border-slate-200/60 bg-white/40 px-8 py-5 transition-all duration-300 hover:bg-white/60 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
          @click="emit('open', nota.id)"
        >
          <div class="flex flex-col">
            <span class="text-sm font-bold text-slate-900 dark:text-white">{{ nota.serie_nota }}-{{ nota.numero_nota }}</span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">ID: {{ nota.numero_nota }}</span>
          </div>

          <div class="flex flex-col truncate">
            <span class="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{{ nota.nome_cliente }}</span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">Serie: {{ nota.serie_nota }}</span>
          </div>

          <div class="text-sm font-medium text-slate-600 dark:text-slate-400">
            {{ formatDate(nota.data_compra) }}
          </div>

          <div class="text-sm font-bold text-slate-900 dark:text-brand-400">
            {{ formatCurrency(nota.valor_total) }}
          </div>

          <div>
            <NotasStatusBadge :status="nota.status_retirada" />
          </div>

          <div class="flex justify-end">
            <a
              v-if="nota.foto_url"
              :href="nota.foto_url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-all hover:border-brand-500 hover:bg-brand-500 hover:text-white dark:border-white/10 dark:hover:border-brand-500"
              title="Ver cupom"
              @click.stop
            >
              <ReceiptText class="h-4 w-4" />
            </a>
            <div v-else class="flex h-9 items-center text-[10px] italic text-slate-400 dark:text-slate-600">
              Sem cupom
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile View -->
      <div class="grid gap-4 md:hidden">
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
