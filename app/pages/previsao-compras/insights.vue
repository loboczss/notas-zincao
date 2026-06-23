<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePrevisaoComprasStore } from '../../stores'
import PrevisaoComprasInsights from '../../components/previsao-compras/insights/PrevisaoComprasInsights.vue'
import type { IntegrimAbcMetric } from '../../../shared/types/IntegrimNotas'

const store = usePrevisaoComprasStore()

const idempresa = ref('')
const dateStart = ref('')
const dateEnd = ref('')

const insightsQueryBase = () => ({
  idempresa: idempresa.value || undefined,
  date_start: dateStart.value || null,
  date_end: dateEnd.value || null,
  page_size: 100,
})

const carregarRuptura = () => store.fetchRuptura(insightsQueryBase())
const carregarAbc = (metric: IntegrimAbcMetric) => store.fetchAbc({ ...insightsQueryBase(), metric })
const carregarSazonalidade = (ano?: number | null) => store.fetchSazonalidade({ idempresa: idempresa.value || undefined, ano })

onMounted(async () => {
  if (!store.abc && !store.loadingInsights) {
    await Promise.all([
      carregarRuptura(),
      carregarAbc('faturamento'),
      carregarSazonalidade()
    ])
  }
})
</script>

<template>
  <PrevisaoComprasInsights
    :abc="store.abc"
    :ruptura="store.ruptura"
    :sazonalidade="store.sazonalidade"
    :loading="store.loadingInsights"
    @load-ruptura="carregarRuptura"
    @load-abc="carregarAbc"
    @load-sazonalidade="carregarSazonalidade"
  />
</template>
