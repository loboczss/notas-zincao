<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore, usePrevisaoComprasStore } from '../../stores'
import PrevisaoComprasAiWorkspace from '../../components/previsao-compras/ai/PrevisaoComprasAiWorkspace.vue'
import type {
  IntegrimCompraAiTaskUpsertRequest,
  IntegrimCompraOportunidadeStatus
} from '../../../shared/types/IntegrimNotas'

const authStore = useAuthStore()
const store = usePrevisaoComprasStore()

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')

const carregarPainelIa = async () => {
  await store.fetchAiDashboard()
}

const criarTaskIa = async (payload: IntegrimCompraAiTaskUpsertRequest) => {
  await store.createAiTask(payload)
}

const atualizarTaskIa = async (id: string, payload: IntegrimCompraAiTaskUpsertRequest) => {
  await store.updateAiTask(id, payload)
}

const rodarTaskIa = async (taskId: string | null) => {
  const result = await store.runAiTask(taskId)
  if (result?.status === 'success') {
    await store.fetchProdutos({ page: 1, page_size: store.pageSize })
  }
}

const atualizarOportunidade = async (input: {
  id: string
  status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>
}) => {
  await store.updateOportunidadeStatus(input.id, input.status)
}

onMounted(async () => {
  if (!authStore.profile) await authStore.getMe()
  if (!store.aiDashboard && !store.loadingAiDashboard) {
    await carregarPainelIa()
  }
})
</script>

<template>
  <PrevisaoComprasAiWorkspace
    :dashboard="store.aiDashboard"
    :loading="store.loadingAiDashboard"
    :action-loading="store.aiActionLoading"
    :is-admin="isAdmin"
    @refresh="carregarPainelIa"
    @create-task="criarTaskIa"
    @update-task="atualizarTaskIa"
    @run-task="rodarTaskIa"
    @opportunity-action="atualizarOportunidade"
  />
</template>
