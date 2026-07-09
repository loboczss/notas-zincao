<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Bot, Settings2, ShoppingCart } from 'lucide-vue-next'
import type { IntegrimCompraParametrosUpdateRequest } from '../../shared/types/IntegrimNotas'
import { useAuthStore, usePrevisaoComprasStore } from '../stores'

import LayoutAppPageShell from '../components/layout/AppPageShell.vue'
import StockIntegrinActions from '../components/stock-integrin/StockIntegrinActions.vue'
import StockIntegrinNotices from '../components/stock-integrin/StockIntegrinNotices.vue'
import PrevisaoComprasProgress from '../components/previsao-compras/core/PrevisaoComprasProgress.vue'
import PrevisaoComprasAjustes from '../components/previsao-compras/config/PrevisaoComprasAjustes.vue'

definePageMeta({
  middleware: ['auth', 'admin'],
})

const route = useRoute()
const authStore = useAuthStore()
const store = usePrevisaoComprasStore()

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')
const syncEmAndamento = computed(() => store.syncing || store.latestRun?.status === 'running')

const navTabs = [
  { to: '/previsao-compras', label: 'Comprar', icon: ShoppingCart },
  { to: '/previsao-compras/ia', label: 'Assistente IA', icon: Bot },
]
const mostrarProgresso = computed(() => syncEmAndamento.value)
const atualizandoLista = ref(false)
const ajustesAberto = ref(false)

const atualizarLista = async () => {
  atualizandoLista.value = true
  try {
    if (route.path === '/previsao-compras/ia') {
      await store.fetchAiDashboard()
    }
    else {
      await Promise.all([
        store.fetchListaCompra({ only_buy: true }),
        store.fetchAiDashboard({ silent: true }),
      ])
    }
  }
  finally {
    atualizandoLista.value = false
  }
}

const sincronizarAgora = async () => {
  if (import.meta.client) {
    const confirmed = window.confirm('Sincronizar baixa as notas fiscais das 6 empresas direto na Integrim e recalcula a analise. A rotina pode levar alguns minutos. Continuar?')
    if (!confirmed) return
  }
  const result = await store.syncNow()
  if (result) await atualizarLista()
}

const pararSincronizacao = async () => {
  if (import.meta.client) {
    const confirmed = window.confirm('Parar a sincronizacao das notas do Integrim? Ela encerra no proximo lote seguro.')
    if (!confirmed) return
  }
  await store.cancelSync()
}

const salvarAjustes = async (payload: IntegrimCompraParametrosUpdateRequest) => {
  const saved = await store.updateCompraParametros(payload)
  if (saved) {
    ajustesAberto.value = false
    if (route.path === '/previsao-compras') {
      await store.fetchListaCompra({ only_buy: true })
    }
  }
}

onMounted(async () => {
  if (!authStore.profile) await authStore.getMe()
  await store.fetchSyncStatus()
  store.resumeSyncTrackingIfRunning()
  store.fetchCompraParametros({ silent: true })
})
</script>

<template>
  <LayoutAppPageShell
    eyebrow="Previsão de Compras"
    title="O que comprar agora"
    description="Mostra o que precisa comprar, por quê e o saldo atual do estoque — com recomendações da IA e relatórios para imprimir."
  >
    <template #headerAside>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <StockIntegrinActions
          :is-admin="isAdmin"
          :show-sync="false"
          :sync-in-progress="syncEmAndamento"
          :cancelling="store.cancelling"
          :loading-produtos="store.loadingProdutos"
          :refreshing="atualizandoLista"
          @sync-now="sincronizarAgora"
          @cancel-sync="pararSincronizacao"
          @refresh="atualizarLista"
        />
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60"
          @click="ajustesAberto = true"
        >
          <Settings2 class="h-4 w-4" />
          Ajustes
        </button>
      </div>
    </template>

    <div class="space-y-5">
      <StockIntegrinNotices
        :readonly-mode="!isAdmin"
        :error-message="store.errorMessage"
        :success-message="store.successMessage"
      />

      <PrevisaoComprasProgress
        v-if="mostrarProgresso"
        :progress="store.syncProgress"
        :syncing="store.syncing"
        :percent="store.syncProgressPercent"
      />

      <PrevisaoComprasProgress
        v-if="store.aiTaskRunning"
        :progress="{ message: store.aiTaskProgressMessage, detail: store.aiTaskProgressDetail }"
        :syncing="true"
        :percent="store.aiTaskProgressPercent"
      />

      <div class="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xs scrollbar-none whitespace-nowrap dark:border-slate-800 dark:bg-slate-900/50">
        <NuxtLink
          v-for="tab in navTabs"
          :key="tab.to"
          :to="tab.to"
          class="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-bold transition"
          :class="route.path === tab.to
            ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
            : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'"
        >
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </NuxtLink>
      </div>

      <NuxtPage />
    </div>

    <PrevisaoComprasAjustes
      v-model="ajustesAberto"
      :parametros="store.compraParametros"
      :saving="store.savingConfig"
      @save="salvarAjustes"
    />
  </LayoutAppPageShell>
</template>
