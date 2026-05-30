<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ArrowLeft, ClipboardList, FileText } from 'lucide-vue-next'
import { useNotasStore } from '~~/app/stores'
import { AppRoute } from '~~/app/constants/routes'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const notasStore = useNotasStore()
const notaId = route.params.id as string

const historico = computed(() => notasStore.historicoAtual)
const loading = computed(() => notasStore.loadingHistorico)

const notaReferencia = computed(() => {
  return notasStore.notas.find(n => n.id === notaId)
    || notasStore.notasRetirada.find(n => n.id === notaId)
    || notasStore.lixeira.find(n => n.id === notaId)
})

onMounted(async () => {
  if (notaId) {
    await notasStore.fetchHistorico(notaId)
  }
})

const goBack = () => {
  navigateTo(AppRoute.notas)
}
</script>

<template>
  <LayoutAppPageShell
    eyebrow="Notas"
    title="Auditoria de nota"
    description="Acompanhe todas as alteracoes e movimentacoes deste registro."
  >
    <template #headerAside>
      <Botao variant="secondary" size="sm" @click="goBack">
        <ArrowLeft class="h-4 w-4" />
        Voltar para notas
      </Botao>
    </template>

    <Card v-if="notaReferencia" padding-class="p-4">
      <div class="flex items-center gap-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <FileText class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-bold uppercase leading-none tracking-wider text-slate-400">
            Nota #{{ notaReferencia.numero_nota }}
          </p>
          <p class="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {{ notaReferencia.nome_cliente }}
          </p>
        </div>
      </div>
    </Card>

    <Card padding-class="p-5 md:p-6">
      <template #header>
        <div class="flex items-center gap-2">
          <ClipboardList class="h-5 w-5 text-slate-400" />
          <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            Fluxo de alteracoes
          </h2>
        </div>
      </template>

      <AuditoriaNotaHistoricoTimeline
        :historico="historico"
        :loading="loading"
      />
    </Card>
  </LayoutAppPageShell>
</template>
