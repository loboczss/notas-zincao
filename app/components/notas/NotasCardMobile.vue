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
    class="glass group relative overflow-hidden rounded-[2rem] border p-5 transition-all duration-300 active:scale-[0.98] dark:border-white/5"
    @click="emit('open', nota.id)"
  >
    <!-- Background Glow -->
    <div class="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-brand-500/5 blur-2xl transition-opacity group-hover:opacity-100" />

    <div class="relative">
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col">
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Nota {{ nota.serie_nota }}-{{ nota.numero_nota }}
          </span>
          <h3 class="mt-1 line-clamp-1 text-base font-bold tracking-tight text-slate-900 dark:text-white">
            {{ nota.nome_cliente }}
          </h3>
        </div>
        <NotasStatusBadge :status="nota.status_retirada" />
      </div>

      <div class="mt-6 grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-opacity-80">Data Compra</span>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ dataCompra }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-opacity-80">Valor Total</span>
          <span class="text-xs font-bold text-brand-600 dark:text-brand-400">{{ valorFormatado }}</span>
        </div>
      </div>

      <div class="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/5">
        <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500">
          Ref: {{ nota.id.slice(0, 8) }}
        </span>

        <div class="flex gap-2">
          <a
            v-if="nota.foto_url"
            :href="nota.foto_url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            @click.stop
          >
            <ReceiptText class="h-3.5 w-3.5 text-brand-500" />
            Cupom
          </a>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition-all hover:bg-brand-600 active:scale-95 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
