<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppPageShell from '../components/layout/AppPageShell.vue'
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger.vue'
import ModalGlobal from '../components/ModalGlobal.vue'
import NotaDetalheModal from '../components/notas/NotaDetalheModal.vue'
import RetiradasHistoricoMobileList from '../components/retiradas/RetiradasHistoricoMobileList.vue'
import RetiradasHistoricoState from '../components/retiradas/RetiradasHistoricoState.vue'
import RetiradasHistoricoTable from '../components/retiradas/RetiradasHistoricoTable.vue'
import RetiradasHistoricoToolbar from '../components/retiradas/RetiradasHistoricoToolbar.vue'
import RetiradasPullRefresh from '../components/retiradas/RetiradasPullRefresh.vue'
import { useRetiradasHistorico } from '../composables/useRetiradasHistorico'
import { getApiFetch } from '../utils/api-fetch'
import type { RetiradaHistoricoEvento } from '../../shared/types/RetiradasHistorico'

definePageMeta({
  middleware: 'auth',
})

const apiFetch = getApiFetch()
const {
  historico,
  loading,
  errorMessage,
  totalHistorico,
  sortKey,
  sortOrder,
  sortOptions,
  sortDescription,
  historicoInicio,
  historicoFim,
  hasMoreHistorico,
  carregarHistorico,
  toggleSort,
  carregarMaisHistorico,
} = useRetiradasHistorico()

const modalAberto = ref(false)
const notaDetalhe = ref<any | null>(null)
const loadingDetalhe = ref(false)

const abrirDetalheNota = async (evento: RetiradaHistoricoEvento) => {
  const notaId = String(evento?.id_nota || '').trim()
  if (!notaId) return

  modalAberto.value = true
  loadingDetalhe.value = true

  try {
    const response = await apiFetch<{ success: boolean; nota: any }>(`/api/notas/${notaId}/detail`)
    notaDetalhe.value = response?.nota || null
  }
  catch (error) {
    console.error('[retiradas/nota-detalhe]', error)
    notaDetalhe.value = null
  }
  finally {
    loadingDetalhe.value = false
  }
}

const fecharDetalheNota = () => {
  modalAberto.value = false
}

onMounted(() => {
  carregarHistorico()
})
</script>

<template>
  <AppPageShell
    eyebrow="Retiradas"
    title="Historico de retiradas"
    description="Consulta simples das entregas registradas por nota, retirado por e produtos retirados."
    width-class="max-w-6xl"
  >
    <RetiradasPullRefresh
      :refreshing="loading"
      @refresh="carregarHistorico"
    >
      <div class="space-y-3 pb-24 md:pb-0">
        <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-500/10 dark:text-rose-300">
          {{ errorMessage }}
        </div>

        <RetiradasHistoricoToolbar
          :inicio="historicoInicio"
          :fim="historicoFim"
          :total="totalHistorico"
          :loading="loading"
          :sort-key="sortKey"
          :sort-order="sortOrder"
          :sort-options="sortOptions"
          :sort-description="sortDescription"
          @sort="toggleSort"
        />

        <RetiradasHistoricoState
          v-if="(loading && !historico.length) || !historico.length"
          :loading="loading"
        />

        <template v-else>
          <RetiradasHistoricoTable
            :historico="historico"
            @open="abrirDetalheNota"
          />

          <RetiradasHistoricoMobileList
            :historico="historico"
            @open="abrirDetalheNota"
          />

          <InfiniteScrollTrigger
            :loading="loading"
            :done="!hasMoreHistorico"
            :loaded-count="historico.length"
            :total="totalHistorico"
            label="retiradas"
            done-label="Todas as retiradas foram carregadas."
            @load-more="carregarMaisHistorico"
          />
        </template>
      </div>
    </RetiradasPullRefresh>

    <ModalGlobal
      v-model="modalAberto"
      title=""
      max-width-class="max-w-6xl"
      content-class="p-0"
      :show-footer="false"
      @update:model-value="(value) => { if (!value) fecharDetalheNota() }"
    >
      <template #header>
        <div class="space-y-1">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Detalhes da nota
          </p>
          <h2 class="truncate text-base font-bold text-slate-950 dark:text-white md:text-lg">
            {{ notaDetalhe ? `Nota ${notaDetalhe.serie_nota || '1'}-${notaDetalhe.numero_nota || ''}` : 'Carregando nota' }}
          </h2>
        </div>
      </template>

      <div v-if="loadingDetalhe" class="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20 text-center">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p class="text-xs text-slate-500">
          Carregando detalhes...
        </p>
      </div>

      <div v-else class="p-6 md:p-8">
        <NotaDetalheModal
          :nota="notaDetalhe"
          :is-admin="false"
        />
      </div>
    </ModalGlobal>
  </AppPageShell>
</template>
