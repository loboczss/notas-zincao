<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ArrowLeft, History, FileText, ClipboardList } from 'lucide-vue-next'
import { useNotasStore } from '~~/app/stores'
import NotaHistoricoTimeline from '~~/app/components/auditoria/NotaHistoricoTimeline.vue'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const notasStore = useNotasStore()
const notaId = route.params.id as string

// Dados reativos da store
const historico = computed(() => notasStore.historicoAtual)
const loading = computed(() => notasStore.loadingHistorico)

// Tentar encontrar a nota na lista atual se existir para mostrar um cabeçalho
const notaReferencia = computed(() => {
  return notasStore.notas.find(n => n.id === notaId) || 
         notasStore.notasRetirada.find(n => n.id === notaId) ||
         notasStore.lixeira.find(n => n.id === notaId)
})

onMounted(async () => {
  if (notaId) {
    await notasStore.fetchHistorico(notaId)
  }
})

const goBack = () => {
  navigateTo('/notas')
}
</script>

<template>
  <NuxtLayout name="default">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Breadcrumbs / Back Button -->
      <button 
        @click="goBack"
        class="group flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-6"
      >
        <div class="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-all">
          <ArrowLeft class="h-4 w-4" />
        </div>
        <span class="text-sm font-medium">Voltar para Notas</span>
      </button>

      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div class="space-y-1">
          <div class="flex items-center gap-3">
            <div class="h-12 w-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900">
              <History class="h-6 w-6" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Auditoria de Nota</h1>
              <p class="text-zinc-500 text-sm">Acompanhe todas as alterações e movimentações deste registro.</p>
            </div>
          </div>
        </div>

        <!-- Mini Info Card -->
        <div v-if="notaReferencia" class="glass-sm p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 min-w-[280px]">
          <div class="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <FileText class="h-5 w-5 text-zinc-500" />
          </div>
          <div class="flex-1">
            <p class="text-[10px] uppercase font-bold text-zinc-400 tracking-wider leading-none mb-1">Nota Nº {{ notaReferencia.numero_nota }}</p>
            <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]">
              {{ notaReferencia.nome_cliente }}
            </p>
          </div>
        </div>
      </div>

      <!-- Timeline Section -->
      <div class="grid grid-cols-1 gap-8">
        <div class="bg-white dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
          <div class="flex items-center gap-2 mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <ClipboardList class="h-5 w-5 text-zinc-400" />
            <h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100">Fluxo de Alterações</h2>
          </div>
          
          <NotaHistoricoTimeline 
            :historico="historico" 
            :loading="loading" 
          />
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.glass-sm {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(4px);
}
.dark .glass-sm {
  background: rgba(24, 24, 27, 0.4);
}
</style>
