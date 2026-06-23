<script setup lang="ts">
import type { IntegrimProdutoValorStats } from '../../../../shared/types/IntegrimNotas'
import {
  formatStockIntegrinCurrency,
  formatStockIntegrinNumber,
} from '../../../utils/stock-integrin-format'
import PcStatTile from '../ui/PcStatTile.vue'

const props = defineProps<{
  stats: IntegrimProdutoValorStats
}>()

const n = (v: number) => formatStockIntegrinNumber(v, 0)
const c = (v: number) => formatStockIntegrinCurrency(v)
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    <PcStatTile label="Produtos vendidos" :value="n(props.stats.total_produtos)" hint="Itens no período" />
    <PcStatTile label="Faturamento" :value="c(props.stats.faturamento_periodo_total)" tone="brand" hint="Total do intervalo" />
    <PcStatTile label="Lucro estimado" :value="c(props.stats.margem_periodo_total)" tone="emerald" hint="Faturamento − custo" />
    <PcStatTile label="Perto de acabar" :value="n(props.stats.produtos_em_risco)" tone="rose" hint="Cobertura < 30 dias" />
    <PcStatTile class="col-span-2 sm:col-span-1" label="Oportunidades IA" :value="n(props.stats.oportunidades_ia)" tone="amber" hint="Sugestões abertas" />
  </div>
</template>
