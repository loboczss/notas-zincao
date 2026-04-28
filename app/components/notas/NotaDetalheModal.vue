<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, Phone, UserRound, ArrowRight, Package, Wallet, CheckCircle2, Info, Camera, ClipboardList, CircleDashed } from 'lucide-vue-next'
import type { NotaAdminEditRequest, NotaRetiradaDetalheItem, NotaProduto } from '../../../shared/types/NotasRetirada'
import NotasStatusBadge from './NotasStatusBadge.vue'
import NotaStatsCard from './NotaStatsCard.vue'
import NotaItemCard from './NotaItemCard.vue'
import NotaLogCard from './NotaLogCard.vue'
import Botao from '../Botao.vue'

const props = withDefaults(defineProps<{
  nota: NotaRetiradaDetalheItem | null
  isAdmin?: boolean
  savingEdit?: boolean
}>(), {})

const emit = defineEmits<{
  (e: 'save-edit', payload: NotaAdminEditRequest): void
}>()

const router = useRouter()

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const produtos = computed(() => Array.isArray(props.nota?.produtos) ? props.nota!.produtos : [])

// Métricas Organizacionais (Stats)
const stats = computed(() => {
  const totalItens = produtos.value.length
  const totalComprado = produtos.value.reduce((acc, p) => acc + toNumber(p.quantidade), 0)
  const totalRetirado = produtos.value.reduce((acc, p) => acc + toNumber(p.quantidade_retirada), 0)
  const totalValor = props.nota?.valor_total || 0
  
  return {
    totalItens,
    totalComprado,
    totalRetirado,
    saldoPendente: Math.max(0, totalComprado - totalRetirado),
    valorTotal: totalValor
  }
})

const historico = computed(() => {
  const raw = Array.isArray(props.nota?.historico_retiradas) ? props.nota!.historico_retiradas : []
  return [...raw].sort((a, b) => new Date(b.data || '').getTime() - new Date(a.data || '').getTime())
})

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
}

const getProdutoNome = (index: number) => {
  return props.nota?.produtos?.[index]?.nome || 'Produto'
}

const irParaRetirada = () => {
  if (props.nota?.id) {
    router.push(`/notas/${props.nota.id}/retirada`)
  }
}

const previewImage = ref<string | null>(null)
const editMode = ref(false)
const editDraft = ref<NotaAdminEditRequest>({
  nome_cliente: '',
  documento_cliente: '',
  telefone_cliente: '',
  contato_id: '',
  produtos: [],
})

const syncDraft = () => {
  if (!props.nota) return
  editDraft.value = {
    nome_cliente: props.nota.nome_cliente || '',
    documento_cliente: String((props.nota as any).documento_cliente || ''),
    telefone_cliente: props.nota.telefone_cliente || '',
    contato_id: String((props.nota as any).contato_id || ''),
    produtos: Array.isArray(props.nota.produtos)
      ? props.nota.produtos.map(item => ({ ...item }))
      : [],
  }
}

watch(() => props.nota, () => {
  editMode.value = false
  syncDraft()
}, { immediate: true })

const adicionarProduto = () => {
  const produtosDraft = Array.isArray(editDraft.value.produtos) ? editDraft.value.produtos : []
  produtosDraft.push({
    nome: '',
    quantidade: 1,
    quantidade_retirada: 0,
    valor_unitario: 0,
    valor_total: 0,
  })
  editDraft.value.produtos = produtosDraft
}

const removerProduto = (index: number) => {
  if (!Array.isArray(editDraft.value.produtos)) return
  editDraft.value.produtos = editDraft.value.produtos.filter((_, i) => i !== index)
}

const cancelarEdicao = () => {
  editMode.value = false
  syncDraft()
}

const salvarEdicao = () => {
  if (!props.isAdmin) return

  const payload: NotaAdminEditRequest = {
    nome_cliente: String(editDraft.value.nome_cliente || '').trim(),
    documento_cliente: String(editDraft.value.documento_cliente || '').trim() || null,
    telefone_cliente: String(editDraft.value.telefone_cliente || '').trim() || null,
    contato_id: String(editDraft.value.contato_id || '').trim() || null,
    produtos: (editDraft.value.produtos || []).map((item) => ({
      ...item,
      nome: String(item.nome || '').trim(),
      quantidade: toNumber(item.quantidade),
      quantidade_retirada: toNumber(item.quantidade_retirada),
      valor_unitario: toNumber(item.valor_unitario),
      valor_total: toNumber(item.valor_total),
      id_produto_estoque: toNumber(item.id_produto_estoque),
    })).filter(item => item.nome),
  }

  emit('save-edit', payload)
  editMode.value = false
}

const editStats = computed(() => {
  const items = Array.isArray(editDraft.value.produtos) ? editDraft.value.produtos : []
  const totalComprado = items.reduce((acc, p) => acc + Math.max(0, toNumber(p.quantidade)), 0)
  const totalRetirado = items.reduce((acc, p) => acc + Math.max(0, toNumber(p.quantidade_retirada)), 0)
  return {
    totalItens: items.length,
    totalComprado,
    totalRetirado,
    saldo: Math.max(0, totalComprado - totalRetirado),
  }
})
</script>

<template>
  <div v-if="nota" class="animate-fade-in flex flex-col max-h-[calc(90vh-6rem)] text-slate-700 dark:text-slate-300 font-sans">
    
    <!-- Área de Conteúdo Rolável -->
    <div class="flex-1 overflow-y-auto space-y-6 pr-2 pb-4">
      
      <!-- StatusBar: Componentes Reutilizáveis -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <NotaStatsCard 
          label="Total Itens" 
          :value="stats.totalComprado" 
          :icon="Package" 
          icon-bg-class="bg-slate-100 text-slate-500 dark:bg-slate-800"
        />
        <NotaStatsCard 
          label="Pendentes" 
          :value="stats.saldoPendente" 
          :icon="CircleDashed" 
          icon-bg-class="bg-amber-50 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400"
          icon-color-class="animate-spin-slow"
        />
        <NotaStatsCard 
          label="Concluídas" 
          :value="stats.totalRetirado" 
          :icon="CheckCircle2" 
          icon-bg-class="bg-emerald-50 text-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
      </div>

      <!-- Edição Administrativa -->
      <section v-if="isAdmin" class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Edição Administrativa</h4>
            <p class="text-xs text-slate-500">Alterar dados da nota e itens.</p>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="!editMode"
              type="button"
              class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              @click="editMode = true"
            >
              Editar Nota
            </button>

            <template v-else>
              <button
                type="button"
                class="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-500 disabled:opacity-60"
                :disabled="!!savingEdit"
                @click="salvarEdicao"
              >
                {{ savingEdit ? 'Salvando...' : 'Salvar Alterações' }}
              </button>
              <button
                type="button"
                class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                :disabled="!!savingEdit"
                @click="cancelarEdicao"
              >
                Cancelar
              </button>
            </template>
          </div>
        </div>

        <div v-if="editMode" class="mt-4 space-y-4">
          <div class="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-xs font-medium text-slate-500">Itens</p>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ editStats.totalItens }}</p>
            </div>
            <div class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-xs font-medium text-slate-500">Qtd Comprada</p>
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ editStats.totalComprado }}</p>
            </div>
            <div class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-xs font-medium text-emerald-600 dark:text-emerald-400">Qtd Retirada</p>
              <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{{ editStats.totalRetirado }}</p>
            </div>
            <div class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-xs font-medium text-brand-600 dark:text-brand-400">Saldo</p>
              <p class="text-sm font-semibold text-brand-600 dark:text-brand-400">{{ editStats.saldo }}</p>
            </div>
          </div>

          <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <label class="space-y-1">
              <span class="text-xs font-medium text-slate-500">Nome do Cliente</span>
              <input
                v-model="editDraft.nome_cliente"
                type="text"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
            </label>
            <label class="space-y-1">
              <span class="text-xs font-medium text-slate-500">CPF/CNPJ</span>
              <input
                v-model="editDraft.documento_cliente"
                type="text"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
            </label>
            <label class="space-y-1">
              <span class="text-xs font-medium text-slate-500">Telefone</span>
              <input
                v-model="editDraft.telefone_cliente"
                type="text"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
            </label>
            <label class="space-y-1">
              <span class="text-xs font-medium text-slate-500">ID Contato (CRM)</span>
              <input
                v-model="editDraft.contato_id"
                type="text"
                class="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
            </label>
          </div>

          <div class="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Itens da Nota</span>
              <button
                type="button"
                class="rounded-lg bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                @click="adicionarProduto"
              >
                + Novo Item
              </button>
            </div>

            <div class="space-y-2">
              <div
                v-for="(produto, index) in editDraft.produtos"
                :key="`edit-${index}`"
                class="grid gap-2 grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] items-end bg-white p-2 rounded-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800"
              >
                <label class="space-y-1">
                  <span class="text-[10px] font-medium text-slate-400 sm:hidden">Produto</span>
                  <input
                    v-model="produto.nome"
                    type="text"
                    class="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] font-medium text-slate-400 sm:hidden">Qtd Comprada</span>
                  <input
                    v-model.number="produto.quantidade"
                    type="number"
                    step="0.01"
                    class="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] font-medium text-slate-400 sm:hidden">Qtd Retirada</span>
                  <input
                    v-model.number="produto.quantidade_retirada"
                    type="number"
                    step="0.01"
                    class="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                </label>
                <label class="space-y-1">
                  <span class="text-[10px] font-medium text-slate-400 sm:hidden">ID Estoque</span>
                  <input
                    v-model.number="produto.id_produto_estoque"
                    type="number"
                    class="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                </label>
                <button
                  type="button"
                  class="h-8 rounded-lg bg-rose-50 px-2 text-xs font-medium text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400"
                  @click="removerProduto(index)"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Layout Principal -->
      <div class="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_320px]">
        
        <div class="space-y-6">
          <!-- Bloco: Contexto da Nota -->
          <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <span class="text-xs font-medium text-slate-500">ID DA NOTA</span>
                <div class="mt-1 flex items-center gap-2">
                  <span class="text-xl font-bold text-slate-900 dark:text-white">{{ nota.numero_nota }}</span>
                  <NotasStatusBadge :status="nota.status_retirada" />
                </div>
              </div>
              <div class="text-right">
                <span class="block text-xs font-medium text-slate-500">Série</span>
                <span class="text-base font-bold text-brand-600 dark:text-brand-400">{{ nota.serie_nota }}</span>
              </div>
            </div>

            <div class="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <!-- Titular -->
              <div class="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <UserRound class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <span class="text-xs font-medium text-slate-500">Titular</span>
                  <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ nota.nome_cliente }}</p>
                  <p v-if="nota.telefone_cliente" class="mt-0.5 text-xs text-slate-500">{{ nota.telefone_cliente }}</p>
                </div>
              </div>

              <!-- Registro -->
              <div class="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <Calendar class="h-4 w-4" />
                </div>
                <div>
                  <span class="text-xs font-medium text-slate-500">Registro</span>
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">Compra: {{ formatDate(nota.data_compra) }}</p>
                  <p class="mt-0.5 text-[10px] text-slate-400">Cadastrado em {{ formatDateTime(nota.criado_em) }}</p>
                  <p v-if="nota.cadastrado_por_nome" class="mt-0.5 text-[10px] font-medium text-brand-600 dark:text-brand-400">Por: {{ nota.cadastrado_por_nome }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- Bloco: Itens do Pedido -->
          <section class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Itens do Pedido</h4>
              <span class="text-xs text-slate-500">{{ nota.produtos?.length || 0 }} itens</span>
            </div>
            
            <div class="space-y-2">
              <NotaItemCard 
                v-for="(produto, index) in nota.produtos" 
                :key="index"
                :produto="produto"
              />
            </div>
          </section>
        </div>

        <!-- Barra Lateral -->
        <aside class="space-y-6">
          <!-- Evidência Fiscal -->
          <section v-if="nota.foto_url" class="space-y-2">
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Evidência Fiscal</h4>
            <div
              class="group relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
              @click="previewImage = nota.foto_url"
            >
              <img :src="nota.foto_url" alt="Cupom" class="h-full w-full object-cover transition-all duration-300 group-hover:opacity-80">
              <div class="absolute inset-0 flex items-center justify-center bg-slate-900/50 opacity-0 transition-opacity group-hover:opacity-100">
                <span class="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-md">Visualizar</span>
              </div>
            </div>
          </section>

          <!-- Log de Operações -->
          <section v-if="historico.length" class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-semibold text-slate-900 dark:text-white">Log de Operações</h4>
              <span class="text-xs text-slate-500">{{ historico.length }} eventos</span>
            </div>

            <div class="space-y-3 border-l border-slate-200 dark:border-slate-800 pl-3 ml-2">
              <NotaLogCard 
                v-for="(item, index) in historico" 
                :key="index"
                :item="item"
                :format-date-time="formatDateTime"
                :get-produto-nome="getProdutoNome"
                @preview="(url) => previewImage = url"
              />
            </div>
          </section>
        </aside>
      </div>
    </div>

    <!-- Área de Rodapé com Botão Fixo -->
    <div class="mt-auto pt-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-30">
      <Botao
        variant="primary"
        class="w-full !shadow-none hover:!shadow-none"
        @click="irParaRetirada"
      >
        Efetuar Retirada
        <ArrowRight class="h-4 w-4 ml-2" />
      </Botao>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else class="flex flex-col items-center justify-center py-12 text-center opacity-60">
    <ArrowRight class="h-6 w-6 -rotate-45 text-slate-400" />
    <p class="mt-2 text-xs font-medium text-slate-500 uppercase">Selecione uma nota</p>
  </div>

  <!-- Zoom Modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="previewImage" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="previewImage = null" />
        
        <div class="relative max-h-full max-w-full overflow-hidden rounded-xl bg-black shadow-2xl">
          <button 
            type="button"
            class="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/75"
            @click="previewImage = null"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          
          <img 
            :src="previewImage" 
            class="h-full max-h-[85vh] w-auto object-contain"
            alt="Preview"
          >
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
