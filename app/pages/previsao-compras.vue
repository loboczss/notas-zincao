<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { BarChart3, Bot, Lightbulb, Settings2, ShoppingCart } from 'lucide-vue-next'
import type {
  IntegrimCompraOportunidadeStatus,
} from '../../shared/types/IntegrimNotas'
import { useAuthStore, usePrevisaoComprasStore } from '../stores'

// Layout e Componentes Gerais
import LayoutAppPageShell from '../components/layout/AppPageShell.vue'
import StockIntegrinActions from '../components/stock-integrin/StockIntegrinActions.vue'
import StockIntegrinNotices from '../components/stock-integrin/StockIntegrinNotices.vue'

// Componentes da Previsão de Compras (pasta core)
import PrevisaoComprasHelpTooltip from '../components/previsao-compras/core/PrevisaoComprasHelpTooltip.vue'
import PrevisaoComprasProgress from '../components/previsao-compras/core/PrevisaoComprasProgress.vue'
import PrevisaoComprasDetailModal from '../components/previsao-compras/core/PrevisaoComprasDetailModal.vue'

definePageMeta({
  middleware: ['auth', 'admin'],
})

const route = useRoute()
const authStore = useAuthStore()
const store = usePrevisaoComprasStore()

const isAdmin = computed(() => String(authStore.profile?.role || '').trim().toLowerCase() === 'admin')
const syncEmAndamento = computed(() => store.syncing || store.latestRun?.status === 'running')
const mostrarProgresso = computed(() => syncEmAndamento.value)
const atualizandoLista = ref(false)

const atualizarLista = async () => {
  atualizandoLista.value = true
  try {
    if (route.path === '/previsao-compras/ia') {
      await store.fetchAiDashboard()
    } else if (route.path === '/previsao-compras/config') {
      await Promise.all([
        store.fetchSyncSchedule(),
        store.fetchSyncHealth(),
        store.fetchCompraParametros({ silent: true }),
      ])
    } else if (route.path === '/previsao-compras') {
      const mode = store.indexTabMode
      if (mode === 'sugestoes') {
        await store.fetchListaCompra()
      } else if (mode === 'todos') {
        await store.fetchProdutos()
      } else if (mode === 'insights') {
        await Promise.all([
          store.fetchRuptura(),
          store.fetchAbc({ metric: 'faturamento' }),
          store.fetchSazonalidade(),
        ])
      }
    }
  } finally {
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

const atualizarOportunidade = async (input: {
  id: string
  status: Extract<IntegrimCompraOportunidadeStatus, 'aceita' | 'ignorada' | 'comprada' | 'expirada'>
}) => {
  const result = await store.updateOportunidadeStatus(input.id, input.status)
  if (!result) return

  if (store.produtoSelecionado?.ai_oportunidade && store.produtoSelecionado.ai_oportunidade.id === input.id) {
    store.produtoSelecionado = {
      ...store.produtoSelecionado,
      ai_oportunidade: {
        ...store.produtoSelecionado.ai_oportunidade,
        status: result.status,
      },
    }
  }

  if (route.path === '/previsao-compras/ia') {
    await store.fetchAiDashboard({ silent: true })
  }
}

onMounted(async () => {
  if (!authStore.profile) await authStore.getMe()
  await store.fetchSyncStatus()
  store.resumeSyncTrackingIfRunning()
})
</script>

<template>
  <LayoutAppPageShell
    eyebrow="Previsão de Compras"
    title="O que vale a pena comprar"
    description="Mostra quais produtos mais vendem e geram lucro, e quais estão perto de acabar, para você decidir as compras."
  >
    <!-- Ações de Header -->
    <template #headerAside>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <!-- Tooltip com legenda das métricas ao passar o mouse -->
        <PrevisaoComprasHelpTooltip />
        
        <StockIntegrinActions
          :is-admin="isAdmin"
          :sync-in-progress="syncEmAndamento"
          :cancelling="store.cancelling"
          :loading-produtos="store.loadingProdutos"
          :refreshing="atualizandoLista"
          @sync-now="sincronizarAgora"
          @cancel-sync="pararSincronizacao"
          @refresh="atualizarLista"
        />
      </div>
    </template>

    <div class="space-y-5">
      <!-- Notificações de Erro/Sucesso -->
      <StockIntegrinNotices
        :readonly-mode="!isAdmin"
        :error-message="store.errorMessage"
        :success-message="store.successMessage"
      />

      <!-- Barra de Progresso de Sincronização -->
      <PrevisaoComprasProgress
        v-if="mostrarProgresso"
        :progress="store.syncProgress"
        :syncing="store.syncing"
        :percent="store.syncProgressPercent"
      />

      <!-- Barra de Progresso da IA de Previsão de Compras -->
      <PrevisaoComprasProgress
        v-if="store.aiTaskRunning"
        :progress="{ message: store.aiTaskProgressMessage, detail: store.aiTaskProgressDetail }"
        :syncing="true"
        :percent="store.aiTaskProgressPercent"
      />

      <!-- Navegação por Abas (Sub-rotas do Nuxt 4) -->
      <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 overflow-x-auto scrollbar-none whitespace-nowrap">
        <NuxtLink
          to="/previsao-compras"
          class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition"
          :class="route.path === '/previsao-compras'
            ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
        >
          <ShoppingCart class="h-4 w-4" />
          Compras & Analítico
        </NuxtLink>
        <NuxtLink
          to="/previsao-compras/ia"
          class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition"
          :class="route.path === '/previsao-compras/ia'
            ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
        >
          <Bot class="h-4 w-4" />
          IA e tasks
        </NuxtLink>
        <NuxtLink
          to="/previsao-compras/config"
          class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition"
          :class="route.path === '/previsao-compras/config'
            ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
        >
          <Settings2 class="h-4 w-4" />
          Agenda & Saúde
        </NuxtLink>
      </div>

      <!-- Conteúdo da Sub-rota Ativa -->
      <NuxtPage />
    </div>

    <!-- Modal Detalhado do Item -->
    <PrevisaoComprasDetailModal
      v-model="store.produtoModalAberto"
      :produto="store.produtoSelecionado"
      @opportunity-action="atualizarOportunidade"
    />
  </LayoutAppPageShell>
</template>
