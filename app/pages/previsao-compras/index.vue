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

const carregarSazonalidade = (ano?: number | null) => store.fetchSazonalidade({ ano })

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

    <!-- Tabela única: "só repor agora" (decisão) ou catálogo completo -->
    <PrevisaoComprasListaCompra
      :rows="store.listaCompra"
      :stats="store.listaCompraStats"
      :loading="store.loadingListaCompra"
      :total-itens="store.listaCompraTotalItens"
      @fetch="carregarListaCompra"
    />

    <!-- Sazonalidade: quando cada mês vende mais -->
    <PrevisaoComprasSazonalidade
      :sazonalidade="store.sazonalidade"
      :loading="store.loadingInsights"
      @load="carregarSazonalidade"
    />
  </div>
</template>
