<script setup lang="ts">
import { 
  Trash2, 
  ArrowLeft, 
  Search, 
  History, 
  RotateCcw, 
  AlertCircle,
  FileText,
  User,
  Calendar,
  Loader2
} from 'lucide-vue-next'
import { useNotasStore } from '~~/app/stores'
import { AppRoute } from '~~/app/constants/routes'
import { useToast } from '~~/app/composables/useToast'

definePageMeta({
  middleware: ['auth', 'admin']
})

const notasStore = useNotasStore()
const { error: showError } = useToast()
const search = ref('')
const modalHistoricoAberto = ref(false)
const loadingVisualizacao = ref(false)
const restaurandoId = ref<string | null>(null)
const notaSelecionada = ref<any | null>(null)
const notaAuditoriaSelecionada = ref<any | null>(null)
const historicoAuditoria = ref<any[]>([])

const filteredLixeira = computed(() => {
  if (!search.value) return notasStore.lixeira
  const s = search.value.toLowerCase()
  return notasStore.lixeira.filter(n => 
    n.nome_cliente.toLowerCase().includes(s) || 
    n.numero_nota.includes(s)
  )
})

onMounted(async () => {
  await notasStore.fetchLixeira()
})

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('pt-BR')
}

const formatCurrency = (value?: number | null) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

const getDeletedByName = (nota?: any) => {
  return String(nota?.deleted_by_profile?.nome || '').trim() || 'Desconhecido'
}

const toDetalheFallback = (nota: any) => ({
  ...nota,
  contato_id: nota?.contato_id ?? null,
  produtos: Array.isArray(nota?.produtos) ? nota.produtos : [],
  historico_retiradas: Array.isArray(nota?.historico_retiradas) ? nota.historico_retiradas : [],
  criado_em: nota?.criado_em || '',
})

const verHistorico = async (nota: any) => {
  modalHistoricoAberto.value = true
  loadingVisualizacao.value = true
  notaAuditoriaSelecionada.value = nota
  notaSelecionada.value = null
  historicoAuditoria.value = []

  try {
    const [detalhe, historico] = await Promise.all([
      notasStore.fetchNotaDetalhe(nota.id),
      notasStore.fetchHistorico(nota.id),
    ])

    notaSelecionada.value = detalhe || toDetalheFallback(nota)
    historicoAuditoria.value = Array.isArray(historico) ? historico : []
  }
  catch (error) {
    console.error('[admin/lixeira] erro ao carregar auditoria:', error)
    notaSelecionada.value = toDetalheFallback(nota)
    showError('Nao foi possivel carregar todos os dados da auditoria.')
  }
  finally {
    loadingVisualizacao.value = false
  }
}

const fecharHistorico = () => {
  modalHistoricoAberto.value = false
  loadingVisualizacao.value = false
  notaSelecionada.value = null
  notaAuditoriaSelecionada.value = null
  historicoAuditoria.value = []
}

const restaurarNota = async (id: string) => {
  if (restaurandoId.value) return

  const confirmar = !import.meta.client || window.confirm('Restaurar esta nota para a lista principal?')
  if (!confirmar) return

  restaurandoId.value = id

  try {
    const restored = await notasStore.restoreNota(id)
    if (restored && notaAuditoriaSelecionada.value?.id === id) {
      fecharHistorico()
    }
  }
  finally {
    restaurandoId.value = null
  }
}
</script>

<template>
  <LayoutAppPageShell
    eyebrow="Área de Auditoria"
    title="Lixeira de Notas"
    description="Gerencie e visualize notas que foram excluídas logicamente do sistema."
  >
    <template #headerAside>
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <div class="relative w-full sm:w-auto">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            v-model="search"
            type="text" 
            placeholder="Buscar na lixeira..."
            class="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all w-full sm:w-64"
          />
        </div>
        <button 
          @click="navigateTo(AppRoute.notas)"
          class="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-all"
        >
          <ArrowLeft class="h-4 w-4" />
          Voltar
        </button>
      </div>
    </template>

    <!-- Info Alert -->
    <div class="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-4 mb-6 flex gap-3 items-start">
      <AlertCircle class="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
      <div class="text-sm text-amber-800 dark:text-amber-400">
        <span class="font-bold">Notas nesta lista não são visíveis no Dashboard principal.</span>
        <span class="block sm:inline sm:ml-1 opacity-90">Elas permanecem no banco de dados para fins de auditoria e conformidade legal.</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!notasStore.loadingLixeira && filteredLixeira.length === 0" class="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl py-20 text-center">
      <div class="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
        <Trash2 class="h-8 w-8 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 class="text-slate-900 dark:text-slate-100 font-bold text-base">Lixeira vazia</h3>
      <p class="text-slate-500 text-sm mt-1">Nenhuma nota excluída foi encontrada.</p>
    </div>

    <!-- Loading State -->
    <div v-else-if="notasStore.loadingLixeira" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="h-48 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
    </div>

    <!-- Grid de Notas Deletadas -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card 
        v-for="nota in filteredLixeira" 
        :key="nota.id"
        class="group transition-all duration-200 hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
        padding-class="p-4"
      >
        <div class="flex justify-between items-start mb-3">
          <div class="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center border border-rose-100/50 dark:border-rose-500/20">
            <FileText class="h-5 w-5 text-rose-500" />
          </div>
          <div class="text-right">
            <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Valor Nota</p>
            <p class="text-base font-bold text-slate-900 dark:text-slate-100">{{ formatCurrency(nota.valor_total) }}</p>
          </div>
        </div>

        <div class="space-y-1 mb-4">
          <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cliente / Nº Nota</p>
          <h3 class="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {{ nota.nome_cliente }}
          </h3>
          <p class="text-xs text-slate-500">Nota Nº {{ nota.numero_nota }} • Série {{ nota.serie_nota }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 py-3 border-t border-slate-100 dark:border-slate-800/50 mb-4 text-xs">
          <div>
            <p class="text-[10px] font-semibold text-slate-400 uppercase mb-1">Excluído em</p>
            <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Calendar class="h-3.5 w-3.5 text-slate-400" />
              {{ formatDateTime((nota as any).deleted_at) }}
            </div>
          </div>
          <div>
            <p class="text-[10px] font-semibold text-slate-400 uppercase mb-1">Por</p>
            <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <User class="h-3.5 w-3.5 text-slate-400" />
              {{ (nota as any).deleted_by_profile?.nome || 'Desconhecido' }}
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button 
            @click="verHistorico(nota)"
            class="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-all"
          >
            <History class="h-3.5 w-3.5" />
            Ver Histórico
          </button>
          <button 
            @click="restaurarNota(nota.id)"
            type="button"
            class="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:bg-brand-500/5 text-slate-400 hover:text-brand-600 rounded-lg transition-all disabled:cursor-wait disabled:opacity-60"
            title="Restaurar Nota"
            :disabled="restaurandoId === nota.id"
            :aria-busy="restaurandoId === nota.id"
          >
            <Loader2 v-if="restaurandoId === nota.id" class="h-4 w-4 animate-spin" />
            <RotateCcw v-else class="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>

    <ModalGlobal
      v-model="modalHistoricoAberto"
      title=""
      max-width-class="max-w-6xl"
      content-class="p-0"
      :show-footer="false"
      @update:model-value="(value) => { if (!value) fecharHistorico() }"
    >
      <template #header>
        <div class="space-y-1">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Auditoria da nota
          </p>
          <h2 class="truncate text-base font-bold text-slate-950 dark:text-white md:text-lg">
            {{ notaSelecionada ? `Nota ${notaSelecionada.serie_nota || '1'}-${notaSelecionada.numero_nota || ''}` : 'Carregando nota' }}
          </h2>
        </div>
      </template>

      <div v-if="loadingVisualizacao" class="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20 text-center">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p class="text-xs text-slate-500">
          Carregando auditoria completa...
        </p>
      </div>

      <div v-else class="space-y-5 p-5 md:p-6">
        <Card
          v-if="notaAuditoriaSelecionada"
          padding-class="p-4"
          class="border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                <Trash2 class="h-5 w-5" />
              </div>
              <div>
                <p class="text-sm font-bold text-slate-950 dark:text-white">
                  Nota movida para a lixeira
                </p>
                <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Este registro permanece disponivel para consulta e conferencia.
                </p>
              </div>
            </div>

            <div class="flex flex-col items-stretch gap-3 sm:items-end">
              <dl class="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 sm:text-right">
                <div>
                  <dt class="font-semibold uppercase tracking-wide text-slate-400">Excluido em</dt>
                  <dd class="mt-1 font-bold text-slate-900 dark:text-white">
                    {{ formatDateTime(notaAuditoriaSelecionada.deleted_at) }}
                  </dd>
                </div>
                <div>
                  <dt class="font-semibold uppercase tracking-wide text-slate-400">Por</dt>
                  <dd class="mt-1 font-bold text-slate-900 dark:text-white">
                    {{ getDeletedByName(notaAuditoriaSelecionada) }}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-500 disabled:cursor-wait disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
                :disabled="restaurandoId === notaAuditoriaSelecionada.id"
                :aria-busy="restaurandoId === notaAuditoriaSelecionada.id"
                @click="restaurarNota(notaAuditoriaSelecionada.id)"
              >
                <Loader2 v-if="restaurandoId === notaAuditoriaSelecionada.id" class="h-3.5 w-3.5 animate-spin" />
                <RotateCcw v-else class="h-3.5 w-3.5" />
                Restaurar nota
              </button>
            </div>
          </div>
        </Card>

        <NotasNotaDetalheModal
          :nota="notaSelecionada"
          :is-admin="false"
          :show-retirada-action="false"
        />

        <Card padding-class="p-4 md:p-5">
          <div class="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <History class="h-4 w-4 text-slate-400" />
              <div>
                <h3 class="text-sm font-bold text-slate-950 dark:text-white">
                  Historico de alteracoes
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Eventos de criacao, edicao e exclusao registrados para esta nota.
                </p>
              </div>
            </div>
          </div>

          <AuditoriaNotaHistoricoTimeline
            :historico="historicoAuditoria"
            :loading="notasStore.loadingHistorico"
          />
        </Card>
      </div>
    </ModalGlobal>
  </LayoutAppPageShell>
</template>
