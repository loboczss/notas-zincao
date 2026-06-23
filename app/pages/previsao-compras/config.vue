<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore, usePrevisaoComprasStore } from '../../stores'
import PrevisaoComprasConfig from '../../components/previsao-compras/config/PrevisaoComprasConfig.vue'
import type {
  IntegrimCompraParametrosUpdateRequest,
  IntegrimSyncScheduleUpdateRequest
} from '../../../shared/types/IntegrimNotas'

const authStore = useAuthStore()
const store = usePrevisaoComprasStore()

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')
const syncEmAndamento = computed(() => store.syncing || store.latestRun?.status === 'running')

const carregarConfig = async () => {
  await Promise.all([
    store.fetchSyncSchedule(),
    store.fetchSyncHealth(),
    store.fetchCompraParametros({ silent: true }),
  ])
}

const salvarAgenda = async (payload: IntegrimSyncScheduleUpdateRequest) => {
  await store.updateSyncSchedule(payload)
}

const salvarParametros = async (payload: IntegrimCompraParametrosUpdateRequest) => {
  await store.updateCompraParametros(payload)
}

const sincronizarPeriodo = async (payload: { date_start: string, date_end: string }) => {
  if (import.meta.client) {
    const confirmed = window.confirm(`Sincronizar as vendas de ${payload.date_start} até ${payload.date_end} das 6 empresas e recalcular a análise. Pode levar alguns minutos. Continuar?`)
    if (!confirmed) return
  }
  const result = await store.syncNow({ date_start: payload.date_start, date_end: payload.date_end })
  if (result) {
    await store.fetchProdutos({ page: 1, page_size: store.pageSize })
  }
}

onMounted(async () => {
  if (!authStore.profile) await authStore.getMe()
  await carregarConfig()
})
</script>

<template>
  <PrevisaoComprasConfig
    :schedule="store.schedule"
    :health="store.health"
    :parametros="store.compraParametros"
    :is-admin="isAdmin"
    :saving="store.savingConfig"
    :syncing="syncEmAndamento"
    @save-schedule="salvarAgenda"
    @save-parametros="salvarParametros"
    @sync-periodo="sincronizarPeriodo"
    @refresh="store.fetchSyncHealth"
  />
</template>
