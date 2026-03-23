<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotasStore } from '../../stores/notas/store'
import Botao from '../Botao.vue'
import Input from '../Input.vue'
import type { NotaRetiradaDetalheItem, NotaRegistrarRetiradaRequest } from '../../../shared/types/NotasRetirada'

const props = defineProps<{
  initialNotaId?: string
}>()

const notasStore = useNotasStore()
const { loadingRetirada, savingRetirada, fetchNotasRetirada, registrarRetirada } = notasStore

const selectedNotaId = ref(props.initialNotaId || '')
const searchQueue = ref('')
const previewImage = ref<string | null>(null)

const notasQueue = ref<NotaRetiradaDetalheItem[]>([])
const currentNota = computed(() => notasQueue.value.find(n => n.id === selectedNotaId.value))

const loadQueue = async () => {
  notasQueue.value = await fetchNotasRetirada() || []
}

loadQueue()

const filteredQueue = computed(() => {
  if (!searchQueue.value) return notasQueue.value
  const s = searchQueue.value.toLowerCase()
  return notasQueue.value.filter(n => 
    n.nome_cliente.toLowerCase().includes(s) || 
    n.numero_nota.toLowerCase().includes(s)
  )
})

const withdrawnItems = ref<Record<string, number>>({})

watch(currentNota, (newNota) => {
  if (newNota) {
    withdrawnItems.value = {}
    newNota.produtos.forEach(p => {
      // Initialize with full pending quantity
      withdrawnItems.value[p.nome] = (p.quantidade || 0) - (p.quantidade_retirada || 0)
    })
  }
}, { immediate: true })

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (ev) => previewImage.value = ev.target?.result as string
    reader.readAsDataURL(file)
  }
}

const confirmWithdrawal = async () => {
  if (!currentNota.value) return
  
  const payload: NotaRegistrarRetiradaRequest = {
    produtos_retirada: Object.entries(withdrawnItems.value).map(([nome, qtd]) => {
      return {
        nome, 
        quantidade_retirada: qtd
      }
    }).filter(i => i.quantidade_retirada > 0),
    foto_cliente_retirada_data_url: previewImage.value || '',
    observacoes: ''
  }
  
  const ok = await registrarRetirada(currentNota.value.id, payload)
  if (ok) {
    selectedNotaId.value = ''
    previewImage.value = null
    await loadQueue()
  }
}
</script>

<template>
  <div class="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl lg:grid-cols-12 min-h-[700px] transition-colors duration-300">
    
    <!-- Sidebar: Active Queue (Fila Ativa) -->
    <aside class="flex flex-col border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 lg:col-span-4 transition-colors duration-300">
      <header class="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-300">
        <h2 class="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Fila Ativa</h2>
        <div class="relative mt-4">
          <input 
            v-model="searchQueue"
            type="text" 
            placeholder="Filtrar fila..."
            class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 pl-9 pr-4 text-xs outline-none focus:border-indigo-500 transition text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
          <svg class="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </header>
      
      <div class="flex-1 overflow-auto p-4 space-y-3 custom-scroll">
        <div v-if="loadingRetirada" class="p-4 text-center text-slate-400">Carregando fila...</div>
        <div v-else-if="filteredQueue.length === 0" class="p-8 text-center text-slate-400">Nenhuma retirada pendente.</div>
        
        <button 
          v-for="nota in filteredQueue" 
          :key="nota.id"
          @click="selectedNotaId = nota.id"
          :class="[
            'w-full rounded-xl p-4 text-left transition duration-200 border',
            selectedNotaId === nota.id 
              ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-900 shadow-md ring-1 ring-indigo-100 dark:ring-indigo-900/30' 
              : 'bg-white dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
          ]"
        >
          <div class="flex items-start justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase text-indigo-500 dark:text-indigo-400">#NF-{{ nota.numero_nota }}</span>
              <h3 class="mt-1 font-bold text-slate-900 dark:text-slate-100 leading-tight">{{ nota.nome_cliente }}</h3>
            </div>
            <div class="rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              Pendente
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span class="flex items-center gap-1">
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              {{ nota.data_compra }}
            </span>
            <span class="font-semibold text-slate-700 dark:text-slate-300">R$ {{ (nota.valor_total || 0).toLocaleString('pt-BR') }}</span>
          </div>
        </button>
      </div>
    </aside>

    <!-- Main Content: Withdrawal Details -->
    <main class="flex flex-col lg:col-span-8 bg-white dark:bg-slate-900 transition-colors duration-300">
      <div v-if="currentNota" class="flex flex-col h-full">
        <header class="p-8 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Retirada de Mercadoria</h1>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Conferência e baixa de itens da nota <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{{ currentNota.numero_nota }}</span></p>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
          </div>
        </header>

        <div class="flex-1 overflow-auto p-8 space-y-10 custom-scroll">
          <!-- Item List -->
          <section>
            <h3 class="mb-5 text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Itens para conferência</h3>
            <div class="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 overflow-hidden">
              <div v-for="item in currentNota.produtos" :key="item.nome" class="grid grid-cols-12 gap-4 p-4 items-center bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                <div class="col-span-6">
                  <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Produto</span>
                  <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ item.nome }}</span>
                </div>
                <div class="col-span-3 text-center">
                  <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Original</span>
                  <span class="text-sm font-bold text-slate-600 dark:text-slate-300">{{ item.quantidade }} {{ item.unidade }}</span>
                </div>
                <div class="col-span-3">
                  <span class="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter text-center">A Retirar</span>
                  <div class="mt-1 flex items-center justify-center">
                    <input 
                      v-model.number="withdrawnItems[item.nome]"
                      type="number" 
                      class="w-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-center text-sm font-bold outline-none focus:border-indigo-500 transition shadow-inner text-slate-900 dark:text-slate-100"
                      :max="(item.quantidade || 0) - (item.quantidade_retirada || 0)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Proof Section -->
          <section class="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div class="space-y-4">
              <h3 class="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Comprovante de entrega</h3>
              <div class="relative group aspect-video overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 transition hover:border-indigo-300 dark:hover:border-indigo-700">
                <div v-if="previewImage" class="h-full w-full">
                  <img :src="previewImage" class="h-full w-full object-cover" />
                  <button @click="previewImage = null" class="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
                </div>
                <label v-else class="flex flex-col items-center justify-center h-full w-full cursor-pointer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-8 w-8 text-slate-300 dark:text-slate-700 group-hover:text-indigo-400 transition mb-2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span class="text-xs font-bold text-slate-400 dark:text-slate-500 group-hover:text-indigo-500">Tirar Foto / Upload</span>
                  <input type="file" class="hidden" accept="image/*" @change="handleFileChange" />
                </label>
              </div>
            </div>

            <div class="space-y-4">
              <h3 class="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Assinatura Digital</h3>
              <div class="flex items-center justify-center aspect-video rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 shadow-inner">
                <span class="text-[10px] font-bold uppercase text-slate-300 dark:text-slate-700 tracking-widest">Área de Assinatura</span>
              </div>
            </div>
          </section>
        </div>

        <footer class="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div class="flex items-center justify-end gap-4">
            <button 
              @click="selectedNotaId = ''"
              class="px-6 py-2.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Cancelar
            </button>
            <button 
              @click="confirmWithdrawal"
              :disabled="savingRetirada"
              class="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-800 px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-950/50 hover:shadow-emerald-300 transition active:scale-95 disabled:opacity-50"
            >
              <span v-if="savingRetirada">Processando...</span>
              <span v-else>Vincular Retirada</span>
            </button>
          </div>
        </footer>
      </div>

      <!-- Empty State -->
      <div v-else class="flex h-full flex-col items-center justify-center p-12 text-center bg-slate-50/20 dark:bg-slate-900 transition-colors duration-300">
        <div class="mb-6 rounded-full bg-slate-100 dark:bg-slate-800 p-8">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="h-20 w-20 text-slate-300 dark:text-slate-700">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">Nenhuma nota selecionada</h2>
        <p class="mt-2 max-w-xs text-slate-500 dark:text-slate-400 leading-relaxed text-sm">Escolha uma nota na fila lateral para iniciar o processo de conferência e retirada.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar {
  width: 5px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
</style>
