<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
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

    <div v-else-if="nota" class="space-y-6">
      <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ nota.nome_cliente }}</h2>
            <NotasStatusBadge :status="nota.status_retirada" />
          </div>
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Nota {{ nota.serie_nota }}-{{ nota.numero_nota }}</p>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400">Data da compra: {{ formatDate(nota.data_compra) }}</p>
      </section>

      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">Itens para Retirada</h3>
        <div class="space-y-3">
          <div
            v-for="(produto, index) in produtos"
            :key="`${nota.id}-${index}`"
            class="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50"
          >
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="font-semibold text-slate-900 text-sm dark:text-white">{{ produto.nome || 'Produto sem nome' }}</p>
                <p v-if="produto.id_produto_estoque" class="text-xs font-medium text-slate-500 dark:text-slate-400">
                  ID: #{{ produto.id_produto_estoque }}
                </p>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <span>Comprado: <strong class="text-slate-900 dark:text-slate-200">{{ toNumber(produto.quantidade) }}</strong></span>
                  <span>Entregue: <strong class="text-emerald-600 dark:text-emerald-400">{{ toNumber(produto.quantidade_retirada) }}</strong></span>
                  <span>Saldo: <strong class="text-brand-600 dark:text-brand-400">{{ saldoItem(produto) }}</strong></span>
                  <span>V. Unit: {{ formatCurrency(produto.valor_unitario) }}</span>
                </div>
              </div>

              <div class="w-full md:w-32 shrink-0">
                <label class="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Quantidade</label>
                <Input
                  v-model="retirarForm[index]"
                  type="number"
                  min="0"
                  step="0.5"
                  :max="String(saldoItem(produto))"
                  placeholder="0"
                  class="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">Evidência e Observações</h3>
        
        <div class="grid gap-6 md:grid-cols-2">
          <label class="block space-y-2">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Foto da Retirada</span>
            <input type="file" accept="image/*" class="block w-full text-sm text-slate-700 dark:text-slate-300" @change="onSelecionarFoto">
          </label>

          <label class="block space-y-2">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Observações (Opcional)</span>
            <textarea
              v-model="observacoesRetirada"
              rows="3"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Ex: Entregue ao motorista João"
            />
          </label>
        </div>

        <div v-if="fotoPreviewUrl" class="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <img :src="fotoPreviewUrl" alt="Preview da retirada" class="max-h-48 w-auto object-contain bg-slate-50 dark:bg-slate-950">
        </div>

        <p v-if="erroLocal" class="text-sm font-medium text-rose-600 dark:text-rose-400">{{ erroLocal }}</p>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row border-t border-slate-100 pt-6 dark:border-slate-800">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
            :disabled="saving"
            @click="submitRetirada"
          >
            {{ saving ? 'Enviando...' : 'Confirmar Retirada' }}
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            @click="router.push('/notas')"
          >
            Cancelar
          </button>
        </div>
      </section>
    </div>
  </AppPageShell>
</template>
