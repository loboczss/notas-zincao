<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Camera, X } from 'lucide-vue-next'

import { $fetch } from 'ofetch'
import { useRoute, useRouter } from 'vue-router'
import type { NotaRegistrarRetiradaRequest } from '../../../../shared/types/NotasRetirada'
import AppPageShell from '../../../components/layout/AppPageShell.vue'
import Input from '../../../components/Input.vue'
import NotasStatusBadge from '../../../components/notas/NotasStatusBadge.vue'
import { useNotasStore } from '../../../stores'

definePageMeta({
  middleware: 'auth',
})

type NotaProdutoPage = {
  nome?: string
  id_produto_estoque?: number | string | null
  quantidade?: number | string
  quantidade_retirada?: number | string
  valor_unitario?: number | string
}

type NotaRetiradaPageData = {
  id: string
  nome_cliente: string
  numero_nota: string
  serie_nota: string
  data_compra: string
  status_retirada: 'pendente' | 'parcial' | 'retirada' | 'cancelada'
  observacoes?: string | null
  foto_url?: string | null
  produtos?: NotaProdutoPage[]
}

const route = useRoute()
const router = useRouter()
const notasStore = useNotasStore()

const notaId = computed(() => String(route.params.id || ''))
const nota = ref<NotaRetiradaPageData | null>(null)
const loading = ref(true)
const saving = ref(false)
const erroLocal = ref('')

const retirarForm = reactive<Record<number, string>>({})
const observacoesRetirada = ref('')
const fotoDataUrl = ref('')
const fotoPreviewUrl = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInput.value?.click()
}


const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const produtos = computed(() => Array.isArray(nota.value?.produtos) ? nota.value!.produtos : [])

const saldoItem = (produto: NotaProdutoPage) => {
  const comprado = Math.max(0, toNumber(produto.quantidade))
  const retirado = Math.max(0, toNumber(produto.quantidade_retirada))
  return Math.max(0, comprado - retirado)
}

const onUpdateRetirar = (index: number, value: string, maxSaldo: number) => {
  if (!value) {
    retirarForm[index] = ''
    return
  }

  const num = toNumber(value)
  if (num < 0) {
    retirarForm[index] = '0'
  } else if (num > maxSaldo) {
    retirarForm[index] = String(maxSaldo)
  } else {
    retirarForm[index] = value
  }
}


const formatDate = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
}

const formatCurrency = (value?: number | string) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(toNumber(value))
}

const carregarDetalhe = async () => {
  loading.value = true

  try {
    const response = await $fetch<{ success: boolean; nota: NotaRetiradaPageData }>(`/api/notas/${notaId.value}/detail`)
    nota.value = response.nota
  }
  finally {
    loading.value = false
  }
}

const onSelecionarFoto = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    fotoDataUrl.value = ''
    fotoPreviewUrl.value = ''
    return
  }

  const reader = new FileReader()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler imagem'))
    reader.readAsDataURL(file)
  })

  fotoDataUrl.value = dataUrl
  fotoPreviewUrl.value = dataUrl
}

const limparFoto = () => {
  fotoDataUrl.value = ''
  fotoPreviewUrl.value = ''
}


const submitRetirada = async () => {
  erroLocal.value = ''

  if (!nota.value) {
    return
  }

  const produtos_retirada = produtos.value
    .map((produto, index) => {
      const nome = String(produto.nome || '').trim()
      const solicitada = Math.max(0, toNumber(retirarForm[index]))
      const saldo = saldoItem(produto)
      const quantidade = Math.min(solicitada, saldo)
      return { nome, quantidade_retirada: quantidade }
    })
    .filter(item => item.nome && item.quantidade_retirada > 0)

  if (!produtos_retirada.length) {
    erroLocal.value = 'Informe ao menos um item para retirada.'
    return
  }

  if (!fotoDataUrl.value) {
    erroLocal.value = 'Selecione uma foto da retirada.'
    return
  }

  const payload: NotaRegistrarRetiradaRequest = {
    produtos_retirada,
    foto_cliente_retirada_data_url: fotoDataUrl.value,
    observacoes: observacoesRetirada.value.trim() || undefined,
  }

  saving.value = true

  try {
    const result = await notasStore.registrarRetirada(nota.value.id, payload)
    if (result) {
      await router.push('/notas')
      return
    }

    erroLocal.value = notasStore.errorMessage || 'Nao foi possivel registrar a retirada.'
  }
  finally {
    saving.value = false
  }
}

await carregarDetalhe()
</script>

<template>
  <AppPageShell
    eyebrow="Retirada"
    title="Registrar Retirada da Nota"
    description="Informe os itens entregues e anexe a evidência da retirada."
  >
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      Carregando nota...
    </div>

    <div v-else-if="nota" class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- Coluna Esquerda: Informações da Nota e Itens -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Dados do Cliente / Nota -->
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 font-bold text-base">
                {{ nota.nome_cliente.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ nota.nome_cliente }}</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Data da compra: {{ formatDate(nota.data_compra) }}</p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1.5">
              <NotasStatusBadge :status="nota.status_retirada" />
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">NOTA {{ nota.serie_nota }}-{{ nota.numero_nota }}</span>
            </div>
          </div>
        </section>

        <!-- Itens para Retirada -->
        <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Itens para Retirada</h3>
            <span class="text-xs font-medium text-slate-400 dark:text-slate-500">{{ produtos.length }} {{ produtos.length === 1 ? 'item cadastrado' : 'itens cadastrados' }}</span>
          </div>
          <div class="space-y-3">
            <div
              v-for="(produto, index) in produtos"
              :key="`${nota.id}-${index}`"
              class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50 transition-all"
            >
              <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div class="space-y-1">
                  <p class="font-bold text-slate-900 text-sm dark:text-white">{{ produto.nome || 'Produto sem nome' }}</p>
                  <p v-if="produto.id_produto_estoque" class="text-xs font-semibold text-slate-400 dark:text-slate-600">
                    CÓD: #{{ produto.id_produto_estoque }}
                  </p>
                  <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50 shadow-xs">
                    <span>Comprado: <strong class="text-slate-900 dark:text-slate-200">{{ toNumber(produto.quantidade) }}</strong></span>
                    <span class="text-slate-300 dark:text-slate-800">|</span>
                    <span>Entregue: <strong class="text-emerald-600 dark:text-emerald-400">{{ toNumber(produto.quantidade_retirada) }}</strong></span>
                    <span class="text-slate-300 dark:text-slate-800">|</span>
                    <span>Saldo: <strong class="text-brand-600 dark:text-brand-400">{{ saldoItem(produto) }}</strong></span>
                    <span class="text-slate-300 dark:text-slate-800">|</span>
                    <span>V. Unit: <strong class="text-slate-700 dark:text-slate-300">{{ formatCurrency(produto.valor_unitario) }}</strong></span>
                  </div>
                </div>

                <div class="w-full md:w-32 shrink-0">
                  <label class="mb-1 block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Retirar</label>
                  <Input
                    :modelValue="retirarForm[index]"
                    @update:modelValue="val => onUpdateRetirar(index, val, saldoItem(produto))"
                    type="number"
                    min="0"
                    step="0.5"
                    :max="String(saldoItem(produto))"
                    placeholder="0"
                    class="h-10 text-sm rounded-xl border-slate-200 font-semibold text-slate-900 dark:text-white dark:border-slate-800 dark:bg-slate-950 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Coluna Direita: Evidência e Ações -->
      <div class="space-y-6">
        <section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">Evidência e Observações</h3>
          
          <!-- UPLOAD ZONE -->
          <div class="space-y-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Foto de Evidência</span>
            
            <div 
              class="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 p-6 transition-all duration-200 hover:border-brand-500 hover:bg-slate-50 dark:hover:bg-slate-950/40 group cursor-pointer shadow-xs"
              @click="triggerFileInput"
            >
              <input 
                ref="fileInput"
                type="file" 
                accept="image/*" 
                class="hidden" 
                @change="onSelecionarFoto"
              >
              
              <div v-if="!fotoPreviewUrl" class="flex flex-col items-center text-center space-y-2">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:bg-brand-950/50 dark:group-hover:text-brand-400 transition-colors duration-200">
                  <Camera class="h-6 w-6" />
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Clique para capturar ou selecionar</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Formatos suportados: JPG, PNG, WEBP</p>
                </div>
              </div>

              <!-- Preview Interno -->
              <div v-else class="relative w-full flex flex-col items-center">
                <img 
                  :src="fotoPreviewUrl" 
                  alt="Preview" 
                  class="max-h-[180px] rounded-lg object-cover shadow-sm border border-slate-200 dark:border-slate-800"
                />
                <button 
                  type="button"
                  class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  @click.stop="limparFoto"
                >
                  <X class="h-3.5 w-3.5" /> Remover Imagem
                </button>
              </div>
            </div>
          </div>

          <!-- OBSERVAÇÕES -->
          <div class="space-y-2">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Observações (Opcional)</span>
            <textarea
              v-model="observacoesRetirada"
              rows="4"
              class="w-full rounded-xl border border-slate-200 bg-slate-50/30 dark:bg-slate-950/20 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition-colors focus:border-brand-500 focus:bg-white dark:focus:bg-slate-950 dark:border-slate-800 shadow-xs"
              placeholder="Ex: Entregue ao motorista João"
            />
          </div>

          <p v-if="erroLocal" class="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200/50 dark:border-rose-900/50">{{ erroLocal }}</p>

          <div class="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-brand-500 shadow-md hover:shadow-brand-500/20 active:scale-98 disabled:opacity-60 disabled:pointer-events-none"
              :disabled="saving"
              @click="submitRetirada"
            >
              <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              {{ saving ? 'Salvando...' : 'Confirmar Retirada' }}
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
              @click="router.push('/notas')"
            >
              Voltar para Notas
            </button>
          </div>
        </section>
      </div>
    </div>

  </AppPageShell>
</template>
