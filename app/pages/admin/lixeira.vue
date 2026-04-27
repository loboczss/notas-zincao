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
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <div class="flex items-center gap-2 text-rose-600 mb-2">
          <Trash2 class="h-5 w-5" />
          <span class="text-xs font-bold uppercase tracking-widest">Área de Auditoria</span>
        </div>
        <h1 class="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Lixeira de Notas</h1>
        <p class="text-zinc-500 mt-1">Gerencie e visualize notas que foram excluídas logicamente do sistema.</p>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input 
            v-model="search"
            type="text" 
            placeholder="Buscar na lixeira..."
            class="pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all w-full md:w-64"
          />
        </div>
        <button 
          @click="navigateTo('/notas')"
          class="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-all"
        >
          <ArrowLeft class="h-4 w-4" />
          Voltar
        </button>
      </div>
    </div>

    <!-- Info Alert -->
    <div class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 mb-8 flex gap-3 items-start">
      <AlertCircle class="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
      <div class="text-sm text-amber-800 dark:text-amber-400">
        <p class="font-bold">Notas nesta lista não são visíveis no Dashboard principal.</p>
        <p class="opacity-80">Elas permanecem no banco de dados para fins de auditoria e conformidade legal.</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!notasStore.loadingLixeira && filteredLixeira.length === 0" class="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl py-20 text-center">
      <div class="h-20 w-20 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
        <Trash2 class="h-10 w-10 text-zinc-300" />
      </div>
      <h3 class="text-zinc-900 dark:text-zinc-100 font-bold text-lg">Lixeira vazia</h3>
      <p class="text-zinc-500">Nenhuma nota excluída foi encontrada.</p>
    </div>

    <!-- Loading State -->
    <div v-else-if="notasStore.loadingLixeira" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="h-48 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"></div>
    </div>

    <!-- Grid de Notas Deletadas -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="nota in filteredLixeira" 
        :key="nota.id"
        class="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-rose-500/5 hover:border-rose-500/30"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center border border-rose-100 dark:border-rose-500/20">
            <FileText class="h-6 w-6 text-rose-500" />
          </div>
          <div class="text-right">
            <p class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">Valor Nota</p>
            <p class="text-lg font-black text-zinc-900 dark:text-zinc-100">{{ formatCurrency(nota.valor_total) }}</p>
          </div>
        </div>

        <div class="space-y-1 mb-6">
          <p class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cliente / Nº Nota</p>
          <h3 class="font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-rose-500 transition-colors">
            {{ nota.nome_cliente }}
          </h3>
          <p class="text-xs text-zinc-500 font-medium">Nota Nº {{ nota.numero_nota }} • Série {{ nota.serie_nota }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 py-4 border-t border-zinc-100 dark:border-zinc-800 mb-6">
          <div>
            <p class="text-[10px] font-bold text-zinc-400 uppercase mb-1">Excluído em</p>
            <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <Calendar class="h-3 w-3 text-zinc-400" />
              {{ formatDateTime((nota as any).deleted_at) }}
            </div>
          </div>
          <div>
            <p class="text-[10px] font-bold text-zinc-400 uppercase mb-1">Por</p>
            <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <User class="h-3 w-3 text-zinc-400" />
              {{ (nota as any).deleted_by_profile?.nome || 'Desconhecido' }}
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button 
            @click="verHistorico(nota.id)"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition-all"
          >
            <History class="h-3.5 w-3.5" />
            Ver Histórico
          </button>
          <button 
            @click="restaurarNota(nota.id)"
            class="px-3 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500/50 hover:bg-rose-500/5 text-zinc-400 hover:text-rose-500 rounded-xl transition-all"
            title="Restaurar Nota"
          >
            <RotateCcw class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
