<script setup lang="ts">
import { onMounted } from 'vue'
import { usePrevisaoComprasStore } from '../../stores'
import type { IntegrimListaCompraQuery } from '../../../shared/types/IntegrimNotas'

import PrevisaoComprasListaCompra from '../../components/previsao-compras/core/PrevisaoComprasListaCompra.vue'
import PrevisaoComprasAiResumo from '../../components/previsao-compras/analise/PrevisaoComprasAiResumo.vue'
import PrevisaoComprasSazonalidade from '../../components/previsao-compras/analise/PrevisaoComprasSazonalidade.vue'

const store = usePrevisaoComprasStore()

const carregarListaCompra = (query: IntegrimListaCompraQuery = {}, options: { append?: boolean } = {}) =>
  store.fetchListaCompra(query, options)

const carregarSazonalidade = (payload: { ano?: number | null; mesInicio?: number }) => store.fetchSazonalidade({ ano: payload.ano, mesInicio: payload.mesInicio })

onMounted(async () => {
  if (!store.listaCompra.length && !store.loadingListaCompra) {
    await store.fetchListaCompra({ only_buy: true })
  }
  if (!store.aiDashboard && !store.loadingAiDashboard) {
    store.fetchAiDashboard({ silent: true })
  }
})
</script>

<template>
  <div class="space-y-5">
    <!-- Resumo das oportunidades da IA (detalhe completo fica na aba IA) -->
    <PrevisaoComprasAiResumo
      :dashboard="store.aiDashboard"
      :loading="store.loadingAiDashboard"
    />

    <!-- Sazonalidade: quando cada mês vende mais.
         Fica ANTES da tabela porque a tabela tem scroll infinito — se ficasse
         depois, o gráfico nunca seria alcançável (a rolagem carrega mais itens). -->
    <PrevisaoComprasSazonalidade
      :sazonalidade="store.sazonalidade"
      :loading="store.loadingInsights"
      @load="carregarSazonalidade"
    />

    <!-- Tabela única (scroll infinito) — sempre por último na página -->
    <PrevisaoComprasListaCompra
      :rows="store.listaCompra"
      :stats="store.listaCompraStats"
      :loading="store.loadingListaCompra"
      :total-itens="store.listaCompraTotalItens"
      @fetch="carregarListaCompra"
    />
  </div>
</template>
