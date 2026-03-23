<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteManagement } from '../../composables/useNoteManagement'
import Botao from '../Botao.vue'
import Input from '../Input.vue'
import Dropmenu from '../Dropmenu.vue'
import NotaSectionCard from '../nota-cadastro/NotaSectionCard.vue'
import NotaUploadImagem from '../nota-cadastro/NotaUploadImagem.vue'
import NotaCampo from '../nota-cadastro/NotaCampo.vue'
import type { NotaRetiradaDraft, NotaMissingField, NotaProduto } from '../../../shared/types/NotasRetirada'
import { useCrmStore } from '../../stores'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  initialData?: Partial<NotaRetiradaDraft>
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const { 
  loadingIA, 
  lastError, 
  lastSuccess, 
  extractNotaFromImage, 
  saveNota 
} = useNoteManagement()

const crmStore = useCrmStore()
const { contatos, loadingContatos } = storeToRefs(crmStore)
const crmBusca = ref('')

const form = ref<NotaRetiradaDraft>({
  nome_cliente: props.initialData?.nome_cliente || '',
  numero_nota: props.initialData?.numero_nota || '',
  serie_nota: props.initialData?.serie_nota || '1',
  data_compra: props.initialData?.data_compra || new Date().toISOString().split('T')[0],
  produtos: props.initialData?.produtos || [],
  status_retirada: props.initialData?.status_retirada || 'pendente',
  ...props.initialData
} as NotaRetiradaDraft)

const items = ref<{ nome: string; qtd: string; preco: string; unidade: string }[]>([
  { nome: '', qtd: '', preco: '', unidade: 'un' }
])

const addItem = () => items.value.push({ nome: '', qtd: '', preco: '', unidade: 'un' })
const removeItem = (index: number) => {
  if (items.value.length > 1) items.value.splice(index, 1)
}

const totalItems = computed(() => {
  return items.value.reduce((acc, item) => {
    const q = parseFloat(item.qtd) || 0
    const p = parseFloat(item.preco) || 0
    return acc + (q * p)
  }, 0)
})

const onFileUploaded = async (dataUrl: string) => {
  const result = await extractNotaFromImage(dataUrl)
  if (result) {
    form.value = { ...form.value, ...result.draft }
    items.value = result.draft.produtos.map(p => ({
      nome: p.nome || '',
      qtd: String(p.quantidade || ''),
      preco: String(p.valor_unitario || ''),
      unidade: p.unidade || 'un'
    }))
  }
}

const handleSave = async () => {
  form.value.produtos = items.value.map(i => ({
    nome: i.nome,
    quantidade: parseFloat(i.qtd),
    valor_unitario: parseFloat(i.preco),
    unidade: i.unidade
  }))
  
  const ok = await saveNota(form.value)
  if (ok) emit('success')
}

const searchCrm = async () => {
  if (crmBusca.value.length > 2) {
    await crmStore.fetchContatos(crmBusca.value)
  }
}

const selectContact = (contact: any) => {
  form.value.nome_cliente = contact.nome
  form.value.contato_id = contact.contato_id
  form.value.telefone_cliente = contact.telefone
  crmBusca.value = contact.nome
}

</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8">
    <!-- Header Strategy: Editorial Depth -->
    <header class="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Nova Nota Fiscal
        </h1>
        <p class="mt-2 text-lg text-slate-600">
          Cadastre e processe notas com o apoio da nossa IA de precisão.
        </p>
      </div>
      <div class="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
        </span>
        Cadastro rápido com IA
      </div>
    </header>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <!-- Main Form Column -->
      <div class="space-y-8 lg:col-span-8">
        
        <!-- AI Processing Card: The Precision Curator style (No thick borders, tonal shifting) -->
        <section class="overflow-hidden rounded-2xl bg-white p-6 shadow-sm shadow-slate-200">
          <div class="mb-6">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-500">
              Processamento inteligente
            </h2>
            <h3 class="mt-1 text-xl font-semibold text-slate-900">Foto do Cupom</h3>
          </div>
          
          <NotaUploadImagem 
            id="nota-main" 
            label="Upload do Cupom"
            :prominent="true" 
            :model-value="form.foto_cupom_data_url"
            @update:model-value="onFileUploaded"
          />
          
          <div v-if="loadingIA" class="mt-4 flex items-center justify-center gap-3 rounded-lg bg-indigo-50 p-4 text-indigo-700">
            <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="font-medium">Analisando dados com IA...</span>
          </div>
        </section>

        <!-- Customer Data Section -->
        <section class="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200">
          <div class="mb-6 flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 class="text-lg font-bold text-slate-900">Dados do Cliente</h2>
          </div>

          <div class="space-y-6">
            <div class="relative">
              <label class="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Buscar no CRM</label>
              <Input 
                v-model="crmBusca" 
                placeholder="Nome, ID ou Telefone..." 
                @input="searchCrm"
              />
              <div v-if="contatos.length && crmBusca" class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                <button 
                  v-for="c in contatos" :key="c.contato_id"
                  class="flex w-full flex-col p-3 transition hover:bg-slate-50 text-left"
                  @click="selectContact(c)"
                >
                  <span class="font-medium text-slate-900">{{ c.nome }}</span>
                  <span class="text-xs text-slate-500">{{ c.contato_id }}</span>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <NotaCampo label="Nome completo" required>
                <Input v-model="form.nome_cliente" />
              </NotaCampo>
              <NotaCampo label="Documento (CPF/CNPJ)">
                <Input v-model="form.documento_cliente" />
              </NotaCampo>
              <NotaCampo label="Telefone" required>
                <Input v-model="form.telefone_cliente" />
              </NotaCampo>
              <NotaCampo label="Data da compra" required>
                <Input v-model="form.data_compra" type="date" />
              </NotaCampo>
            </div>
          </div>
        </section>

        <!-- Dynamic Items List -->
        <section class="rounded-2xl bg-white p-6 shadow-sm shadow-slate-200">
          <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 class="text-lg font-bold text-slate-900">Itens da Nota</h2>
            </div>
            <button 
              type="button" 
              class="text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
              @click="addItem"
            >
              + Adicionar Item
            </button>
          </div>

          <div class="space-y-4">
            <div v-for="(item, idx) in items" :key="idx" class="group relative grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-50 md:grid-cols-12">
              <div class="md:col-span-12 lg:col-span-5">
                <label class="mb-1 block text-[10px] font-bold uppercase tracking-tight text-slate-400">Produto</label>
                <input v-model="item.nome" class="w-full bg-transparent border-b border-slate-200 py-1 outline-none focus:border-indigo-500 transition" placeholder="Descrição do item..." />
              </div>
              <div class="md:col-span-4 lg:col-span-2">
                <label class="mb-1 block text-[10px] font-bold uppercase tracking-tight text-slate-400">Qtd</label>
                <input v-model="item.qtd" type="number" class="w-full bg-transparent border-b border-slate-200 py-1 outline-none focus:border-indigo-500 transition" />
              </div>
              <div class="md:col-span-4 lg:col-span-2">
                <label class="mb-1 block text-[10px] font-bold uppercase tracking-tight text-slate-400">Unidade</label>
                <select v-model="item.unidade" class="w-full bg-transparent border-b border-slate-200 py-1 outline-none focus:border-indigo-500 transition">
                  <option value="un">un</option>
                  <option value="kg">kg</option>
                  <option value="m">m</option>
                </select>
              </div>
              <div class="md:col-span-4 lg:col-span-2">
                <label class="mb-1 block text-[10px] font-bold uppercase tracking-tight text-slate-400">Preço</label>
                <input v-model="item.preco" type="number" step="0.01" class="w-full bg-transparent border-b border-slate-200 py-1 outline-none focus:border-indigo-500 transition" />
              </div>
              <div class="absolute -right-2 -top-2 scale-0 group-hover:scale-100 transition duration-200 md:relative md:scale-100 md:right-0 md:top-0 md:col-span-1 flex items-end pb-1">
                <button @click="removeItem(idx)" class="text-slate-300 hover:text-rose-500 transition p-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Detail/Summary Column -->
      <aside class="space-y-8 lg:col-span-4">
        <section class="sticky top-8 space-y-8">
          <!-- Summary Card -->
          <div class="rounded-2xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-200">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">Resumo da Nota</h2>
            
            <div class="mt-8 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-800 pb-4">
                <span class="text-slate-400">Total de Itens</span>
                <span class="text-lg font-semibold">{{ items.length }}</span>
              </div>
              <div class="pt-4">
                <span class="text-xs uppercase tracking-wider text-slate-400">Valor Total Estimado</span>
                <div class="mt-1 text-3xl font-bold text-indigo-400">
                  R$ {{ totalItems.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
                </div>
              </div>
            </div>

            <div class="mt-10">
              <NotaCampo label="Observações">
                <textarea 
                  v-model="form.observacoes" 
                  rows="4" 
                  class="w-full rounded-xl bg-slate-800 border-none p-4 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  placeholder="Instruções especiais..."
                ></textarea>
              </NotaCampo>
            </div>
          </div>

          <!-- Status / Action help -->
          <div class="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6">
            <h3 class="flex items-center gap-2 font-bold text-indigo-900">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Verificação de Segurança
            </h3>
            <p class="mt-2 text-sm text-indigo-700/80 leading-relaxed">
              Confira se os dados extraídos pela IA conferem com o documento físico antes de finalizar o cadastro.
            </p>
          </div>
        </section>
      </aside>
    </div>

    <!-- Sticky Action Bar -->
    <nav class="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 bg-white/80 p-4 backdrop-blur-md">
      <div class="mx-auto flex max-w-5xl items-center justify-end gap-4">
        <button 
          @click="emit('cancel')"
          class="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition"
        >
          Descartar
        </button>
        <button 
          @click="handleSave"
          class="rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 px-10 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition active:scale-95"
        >
          Finalizar Cadastro
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
/* Optional: Custom scrollbar for CRM list */
.custom-scroll::-webkit-scrollbar {
  width: 4px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
</style>
