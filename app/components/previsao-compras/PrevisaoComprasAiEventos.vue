<script setup lang="ts">
import { CalendarClock, ExternalLink } from 'lucide-vue-next'
import type {
  IntegrimCompraAiEvento,
  IntegrimCompraEventoTipo,
} from '../../../shared/types/IntegrimNotas'
import { formatStockIntegrinNumber } from '../../utils/stock-integrin-format'
import Card from '../Card.vue'

const props = defineProps<{
  eventos: IntegrimCompraAiEvento[]
}>()

const eventTypeLabels: Record<IntegrimCompraEventoTipo, string> = {
  clima: 'Clima',
  cidade: 'Cidade',
  esporte: 'Esporte',
  feriado: 'Feriado',
  obra: 'Obra',
  tendencia: 'Tendência',
  fornecedor: 'Fornecedor',
}

const eventTypeBadgeClass = (tipo: IntegrimCompraEventoTipo) => {
  const classes: Record<IntegrimCompraEventoTipo, string> = {
    clima: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-800/40',
    cidade: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-800/40',
    esporte: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800/40',
    feriado: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800/40',
    obra: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800/40',
    tendencia: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-800/40',
    fornecedor: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  }
  return classes[tipo] || 'bg-slate-100 text-slate-600'
}

const sourceUrl = (source: unknown) => {
  if (!source || typeof source !== 'object') return ''
  return String((source as { url?: unknown }).url || '').trim()
}

const sourceTitle = (source: unknown) => {
  if (!source || typeof source !== 'object') return 'Ver fonte'
  return String((source as { title?: unknown }).title || 'Ver fonte').trim()
}

const formatPercent = (value: unknown) =>
  `${formatStockIntegrinNumber(Number(value || 0) * 100, 0)}%`
</script>

<template>
  <Card padding-class="p-0" class="overflow-hidden">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-950 dark:text-slate-50">Eventos Encontrados</h2>
        <CalendarClock class="h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
      </div>
    </template>

    <div v-if="!props.eventos.length" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      Nenhum evento detectado recentemente.
    </div>

    <div v-else class="divide-y divide-slate-100 dark:divide-slate-800/70">
      <div
        v-for="evento in props.eventos"
        :key="evento.id"
        class="grid gap-4 p-5 hover:bg-slate-50/35 dark:hover:bg-slate-900/10 transition-colors md:grid-cols-[160px_minmax(0,1fr)_200px]"
      >
        <!-- Tipo de Evento e Confiança -->
        <div class="space-y-1.5">
          <span class="inline-flex rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" :class="eventTypeBadgeClass(evento.tipo)">
            {{ eventTypeLabels[evento.tipo] }}
          </span>
          <div class="text-[11px] font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1">
            <span>Confiança:</span>
            <span class="text-slate-700 dark:text-slate-200">{{ formatPercent(evento.confidence) }}</span>
          </div>
        </div>

        <!-- Conteúdo do Evento (Título e Resumo) -->
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-50">
            {{ evento.titulo }}
          </h3>
          <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {{ evento.resumo }}
          </p>
        </div>

        <!-- Metadados (Região, Data e Fonte) -->
        <div class="flex flex-col justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div class="space-y-1">
            <div class="font-bold text-slate-700 dark:text-slate-300">
              Região: <span class="font-semibold text-slate-600 dark:text-slate-400">{{ evento.regiao || 'Nacional' }}</span>
            </div>
            <div class="text-[11px] leading-normal text-slate-400">
              Período: <span class="font-semibold">{{ evento.data_inicio || '-' }}</span> até <span class="font-semibold">{{ evento.data_fim || '-' }}</span>
            </div>
          </div>

          <!-- Link de Fonte -->
          <div v-if="evento.fontes.length && sourceUrl(evento.fontes[0])" class="pt-1">
            <a
              class="inline-flex items-center gap-1 font-bold text-brand-600 hover:text-brand-500 dark:text-brand-400"
              :href="sourceUrl(evento.fontes[0])"
              target="_blank"
              rel="noreferrer"
            >
              {{ sourceTitle(evento.fontes[0]) }}
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
