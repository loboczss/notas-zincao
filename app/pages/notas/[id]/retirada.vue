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
    title="Registrar retirada da nota"
    description="Informe os itens entregues e anexe a evidencia da retirada."
  >
    <div v-if="loading" class="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      Carregando nota...
    </div>

    <div v-else-if="nota" class="space-y-6">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-3 flex items-start justify-between gap-2">
          <NotasStatusBadge :status="nota.status_retirada" />
          <p class="text-xs text-slate-500 dark:text-slate-400">Nota {{ nota.serie_nota }}-{{ nota.numero_nota }}</p>
        </div>
        <h2 class="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">{{ nota.nome_cliente }}</h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Data da compra: {{ formatDate(nota.data_compra) }}</p>
      </section>

      <section class="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 class="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Itens para retirada</h3>
        <div class="space-y-3">
          <div
            v-for="(produto, index) in produtos"
            :key="`${nota.id}-${index}`"
            class="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p class="font-semibold text-slate-900 dark:text-slate-100">{{ produto.nome || 'Produto sem nome' }}</p>
                <p v-if="produto.id_produto_estoque" class="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  ID do estoque: #{{ produto.id_produto_estoque }}
                </p>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  Comprado: {{ toNumber(produto.quantidade) }} | Entregue: {{ toNumber(produto.quantidade_retirada) }} | Saldo: {{ saldoItem(produto) }}
                </p>
                <p class="text-sm text-slate-600 dark:text-slate-300">Valor unitario: {{ formatCurrency(produto.valor_unitario) }}</p>
              </div>

              <div class="w-full md:w-40">
                <label class="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Quantidade</label>
                <Input
                  v-model="retirarForm[index]"
                  type="number"
                  min="0"
                  step="0.5"
                  :max="String(saldoItem(produto))"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Foto da retirada</span>
          <input type="file" accept="image/*" class="block w-full text-sm text-slate-700 dark:text-slate-300" @change="onSelecionarFoto">
        </label>

        <div v-if="fotoPreviewUrl" class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
          <img :src="fotoPreviewUrl" alt="Preview da retirada" class="max-h-52 w-full object-cover">
        </div>

        <label class="block space-y-1">
          <span class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Observacoes</span>
          <textarea
            v-model="observacoesRetirada"
            rows="4"
            class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Opcional"
          />
        </label>

        <p v-if="erroLocal" class="text-sm text-rose-600 dark:text-rose-400">{{ erroLocal }}</p>

        <div class="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            class="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-60"
            :disabled="saving"
            @click="submitRetirada"
          >
            {{ saving ? 'Enviando...' : 'Confirmar retirada' }}
          </button>

          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            @click="router.push('/notas')"
          >
            Cancelar
          </button>
        </div>
      </section>
    </div>
  </AppPageShell>
</template>
