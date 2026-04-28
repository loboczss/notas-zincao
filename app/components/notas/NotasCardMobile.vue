<script setup lang="ts">
import { computed } from 'vue'
import { ReceiptText } from 'lucide-vue-next'
import type { NotaRetiradaListItem } from '../../../shared/types/NotasRetirada'
import NotasStatusBadge from './NotasStatusBadge.vue'

const props = defineProps<{
  nota: NotaRetiradaListItem
}>()

const emit = defineEmits<{
  (e: 'open', notaId: string): void
}>()

const dataCompra = computed(() => {
  const raw = props.nota.data_compra
  if (!raw) return '-'
  return new Date(raw).toLocaleDateString('pt-BR')
})

const valorFormatado = computed(() => {
  const valor = Number(props.nota.valor_total || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
})
</script>

<template>
  <article
    class="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 cursor-pointer active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50"
    @click="emit('open', nota.id)"
  >
    <div class="relative">
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
            Nota {{ nota.serie_nota }}-{{ nota.numero_nota }}
          </span>
          <h3 class="mt-1 line-clamp-1 text-sm font-medium text-slate-900 dark:text-slate-200">
            {{ nota.nome_cliente }}
          </h3>
        </div>
        <NotasStatusBadge :status="nota.status_retirada" />
      </div>

      <div class="mt-4 grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">Data Compra</span>
          <span class="text-sm font-medium text-slate-900 dark:text-slate-200">{{ dataCompra }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">Valor Total</span>
          <span class="text-sm font-medium text-slate-900 dark:text-slate-200">{{ valorFormatado }}</span>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <span class="text-xs text-slate-400 dark:text-slate-500">
          Ref: {{ nota.id.slice(0, 8) }}
        </span>

        <div class="flex gap-2">
          <a
            v-if="nota.foto_url"
            :href="nota.foto_url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            @click.stop
          >
            <ReceiptText class="h-3.5 w-3.5" />
            <span>Cupom</span>
          </a>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
