<script setup lang="ts">
import { HelpCircle } from 'lucide-vue-next'

const glossario = [
  { termo: 'Vende por dia', texto: 'Media de unidades vendidas por dia no periodo filtrado.' },
  { termo: 'Em estoque', texto: 'Quantidade disponivel agora no estoque.' },
  { termo: 'Dura ~X dias', texto: 'Tempo estimado que o estoque aguenta no ritmo de venda do filtro.' },
  { termo: 'Comprar', texto: 'Sugestao matematica para atingir a cobertura escolhida.' },
  { termo: 'IA', texto: 'Compra extra sugerida por evento externo com fonte publica e aprovacao manual.' },
  { termo: 'Faturamento', texto: 'Total vendido em reais no periodo analisado.' },
  { termo: 'Margem', texto: 'Faturamento bruto menos o custo estimado no periodo.' },
  { termo: 'Score', texto: 'Nota de 0 a 100 baseada em faturamento, lucro, giro e urgencia.' },
]
</script>

<template>
  <div class="relative group inline-block">
    <div
      class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs cursor-help hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 transition"
      role="tooltip"
      aria-label="Legenda das metricas"
    >
      <HelpCircle class="h-4 w-4 text-brand-600 dark:text-brand-400" />
      <span>Como ler esta tela</span>
    </div>

    <div class="absolute right-0 top-full mt-2 w-80 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 ease-out z-50 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div class="mb-3 border-b border-slate-100 pb-2 dark:border-slate-800">
        <h5 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
          Significado das metricas
        </h5>
      </div>
      <dl class="space-y-3">
        <div v-for="g in glossario" :key="g.termo" class="space-y-0.5">
          <dt class="text-[11px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-400">
            {{ g.termo }}
          </dt>
          <dd class="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            {{ g.texto }}
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
