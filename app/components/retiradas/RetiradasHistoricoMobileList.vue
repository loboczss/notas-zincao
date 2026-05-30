<script setup lang="ts">
import type { RetiradaHistoricoEvento } from '../../../shared/types/RetiradasHistorico'
import {
  formatRetiradaDateParts,
  formatRetiradaNumber,
  formatRetiradaZinco,
  getRetiradaItensResumo,
} from '../../utils/retiradas-historico'

defineProps<{
  historico: RetiradaHistoricoEvento[]
}>()

const emit = defineEmits<{
  (e: 'open', evento: RetiradaHistoricoEvento): void
}>()
</script>

<template>
  <div class="space-y-2 md:hidden">
    <CardButton
      v-for="evento in historico"
      :key="`${evento.id_nota}-${evento.data}-mobile`"
      class="p-3 active:scale-[0.99]"
      @click="emit('open', evento)"
    >
      <div class="flex min-w-0 items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="break-words text-sm font-bold leading-snug text-slate-950 dark:text-white">
            {{ evento.nome_cliente }}
          </h3>
          <p class="mt-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
            Nota {{ evento.serie_nota }}-{{ evento.numero_nota }}
          </p>
        </div>

        <span class="shrink-0 text-sm font-bold text-brand-700 dark:text-brand-300">
          {{ formatRetiradaZinco(evento.reducao_zinco_10) }}
        </span>
      </div>

      <div class="mt-3 space-y-2 text-xs">
        <div class="flex justify-between gap-3">
          <span class="text-slate-500 dark:text-slate-400">Data</span>
          <span class="text-right font-semibold text-slate-900 dark:text-slate-100">
            {{ formatRetiradaDateParts(evento.data).date }} as {{ formatRetiradaDateParts(evento.data).time }}
          </span>
        </div>

        <div class="flex justify-between gap-3">
          <span class="shrink-0 text-slate-500 dark:text-slate-400">Retirado por</span>
          <span class="min-w-0 break-words text-right font-semibold text-slate-900 dark:text-slate-100">
            {{ evento.responsavel_nome || 'Sistema' }}
          </span>
        </div>

        <div class="border-t border-slate-100 pt-2 dark:border-slate-800">
          <p class="font-semibold text-slate-800 dark:text-slate-200">
            {{ getRetiradaItensResumo(evento) }}
          </p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="(item, index) in evento.itens"
              :key="`${evento.id_nota}-${evento.data}-mobile-item-${index}`"
              class="max-w-full break-words rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {{ item.nome }}: {{ formatRetiradaNumber(item.quantidade) }}
            </span>
          </div>
          <p v-if="evento.observacoes" class="mt-2 break-words text-xs text-slate-500 dark:text-slate-400">
            {{ evento.observacoes }}
          </p>
        </div>
      </div>
    </CardButton>
  </div>
</template>
