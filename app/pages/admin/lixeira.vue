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
  Calendar
} from 'lucide-vue-next'
import { useNotasStore } from '~~/app/stores'
import AppPageShell from '~~/app/components/layout/AppPageShell.vue'
import Card from '~~/app/components/Card.vue'

definePageMeta({
  middleware: 'auth'
})

const notasStore = useNotasStore()
const search = ref('')

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

const verHistorico = (id: string) => {
  navigateTo(`/notas/${id}/historico`)
}

const restaurarNota = async (id: string) => {
  // Implementação futura ou via API de restore se disponível
  alert('Função de restaurar nota será implementada em breve.')
}
</script>

<template>
  <AppPageShell
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
          @click="navigateTo('/notas')"
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
            @click="verHistorico(nota.id)"
            class="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-all"
          >
            <History class="h-3.5 w-3.5" />
            Ver Histórico
          </button>
          <button 
            @click="restaurarNota(nota.id)"
            class="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:bg-brand-500/5 text-slate-400 hover:text-brand-600 rounded-lg transition-all"
            title="Restaurar Nota"
          >
            <RotateCcw class="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  </AppPageShell>
</template>
