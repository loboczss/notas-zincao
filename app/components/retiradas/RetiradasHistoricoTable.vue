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
  <div class="hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
    <table class="w-full table-fixed text-left text-sm">
      <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
        <tr>
          <th class="w-[18%] px-4 py-3">Data</th>
          <th class="w-[28%] px-4 py-3">Cliente</th>
          <th class="w-[32%] px-4 py-3">Itens</th>
          <th class="w-[14%] px-4 py-3">Retirado por</th>
          <th class="w-[8%] px-4 py-3 text-right">Zinco</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        <tr
          v-for="evento in historico"
          :key="`${evento.id_nota}-${evento.data}`"
          class="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-950/40"
          @click="emit('open', evento)"
        >
          <td class="px-4 py-4 align-top">
            <p class="font-semibold text-slate-950 dark:text-slate-100">
              {{ formatRetiradaDateParts(evento.data).date }}
            </p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {{ formatRetiradaDateParts(evento.data).time }}
            </p>
          </td>

          <td class="px-4 py-4 align-top">
            <p class="break-words font-semibold leading-snug text-slate-950 dark:text-slate-100">
              {{ evento.nome_cliente }}
            </p>
            <p class="mt-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Nota {{ evento.serie_nota }}-{{ evento.numero_nota }}
            </p>
          </td>

          <td class="px-4 py-4 align-top">
            <p class="font-semibold text-slate-800 dark:text-slate-200">
              {{ getRetiradaItensResumo(evento) }}
            </p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="(item, index) in evento.itens"
                :key="`${evento.id_nota}-${evento.data}-${index}`"
                class="max-w-full break-words rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {{ item.nome }}: {{ formatRetiradaNumber(item.quantidade) }}
              </span>
            </div>
            <p v-if="evento.observacoes" class="mt-2 break-words text-xs text-slate-500 dark:text-slate-400">
              {{ evento.observacoes }}
            </p>
          </td>

          <td class="px-4 py-4 align-top">
            <p class="break-words text-xs font-medium text-slate-600 dark:text-slate-300">
              {{ evento.responsavel_nome || 'Sistema' }}
            </p>
          </td>

          <td class="px-4 py-4 text-right align-top">
            <p class="font-bold text-brand-700 dark:text-brand-300">
              {{ formatRetiradaZinco(evento.reducao_zinco_10) }}
            </p>
            <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              m2
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
