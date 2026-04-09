<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppPageShell from '../components/layout/AppPageShell.vue'
import ModalGlobal from '../components/ModalGlobal.vue'
import NotaCadastroCaptura from '../components/nota-cadastro/NotaCadastroCaptura.vue'
import NotaCadastroCliente from '../components/nota-cadastro/NotaCadastroCliente.vue'
import NotaCadastroFiscal from '../components/nota-cadastro/NotaCadastroFiscal.vue'
import NotaCadastroProdutos from '../components/nota-cadastro/NotaCadastroProdutos.vue'
import NotaCadastroResumo from '../components/nota-cadastro/NotaCadastroResumo.vue'
import type { CrmContato } from '../../shared/types/CRM'
import type { NotaProduto, NotaRetiradaDraft, NotaRetiradaListItem } from '../../shared/types/NotasRetirada'
import { useCrmStore, useNotasStore } from '../stores'

definePageMeta({
  middleware: 'auth',
})

const router = useRouter()
const notasStore = useNotasStore()
const crmStore = useCrmStore()

const form = reactive<NotaRetiradaDraft>({
  nome_cliente: '',
  telefone_cliente: '',
  documento_cliente: '',
  numero_nota: '',
  serie_nota: '1',
  chave_nfe: '',
  data_compra: '',
  observacoes: '',
  produtos: [],
  valor_total: 0,
  desconto_total: 0,
  status_retirada: 'pendente',
})

const errors = reactive<Record<string, string>>({})
const imageDataUrl = ref('')
const successModalOpen = ref(false)
const createdNota = ref<{ id: string; numero_nota: string; serie_nota: string } | null>(null)
let crmSearchTimer: ReturnType<typeof setTimeout> | null = null

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const digitsOnly = (value: string) => value.replace(/\D/g, '')

const formatPhone = (value: string) => {
  const digits = digitsOnly(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  return digits
}

const formatDocument = (value: string) => {
  const digits = digitsOnly(value).slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

const totalProdutos = computed(() => {
  return form.produtos.reduce((acc, produto) => {
    const quantidade = toNumber(produto.quantidade)
    const valorUnitario = toNumber(produto.valor_unitario)
    return acc + quantidade * valorUnitario
  }, 0)
})

const descontoTotalNumber = computed(() => Math.max(0, toNumber(form.desconto_total)))
const valorLiquido = computed(() => Math.max(0, totalProdutos.value - descontoTotalNumber.value))

const duplicateNota = computed<NotaRetiradaListItem | null>(() => {
  const numeroNota = form.numero_nota.trim()
  const serieNota = (form.serie_nota || '1').trim()
  const chaveNfe = digitsOnly(String(form.chave_nfe || ''))

  return notasStore.notas.find((nota) => {
    const mesmoNumeroSerie = numeroNota && nota.numero_nota === numeroNota && nota.serie_nota === serieNota
    const mesmaChave = chaveNfe && digitsOnly(String((nota as unknown as { chave_nfe?: string }).chave_nfe || '')) === chaveNfe
    return mesmoNumeroSerie || !!mesmaChave
  }) || null
})

const crmQueryAtiva = computed(() => form.nome_cliente.trim().length >= 2)
const showCrmSuggestions = computed(() => crmQueryAtiva.value && crmStore.contatos.length > 0)
const showCrmNoResults = computed(() => crmQueryAtiva.value && !crmStore.loadingContatos && crmStore.contatos.length === 0)

const divergenceWarning = computed(() => {
  const valorExtraido = toNumber(form.valor_total)
  const somaProdutos = totalProdutos.value

  if (!valorExtraido || !somaProdutos) {
    return ''
  }

  const diferenca = Math.abs(valorExtraido - somaProdutos)
  const base = Math.max(valorExtraido, somaProdutos)

  if (!base || diferenca / base <= 0.05) {
    return ''
  }

  return `[Conferência automática IA] Total da foto: ${valorExtraido.toFixed(2)} | Soma dos itens: ${somaProdutos.toFixed(2)}`
})

const resetErrors = () => {
  Object.keys(errors).forEach((key) => {
    delete errors[key]
  })
}

const ensureWarningInObservacoes = () => {
  const observacoes = String(form.observacoes || '').trim()
  const warning = divergenceWarning.value

  if (!warning) {
    form.observacoes = observacoes
    return
  }

  if (observacoes.includes(warning)) {
    form.observacoes = observacoes
    return
  }

  form.observacoes = observacoes ? `${observacoes}\n${warning}` : warning
}

const validateForm = () => {
  resetErrors()

  if (!String(form.nome_cliente || '').trim()) {
    errors.nome_cliente = 'Nome do cliente é obrigatório.'
  }

  if (!digitsOnly(String(form.telefone_cliente || '')).trim()) {
    errors.telefone_cliente = 'Telefone é obrigatório.'
  }

  if (!String(form.numero_nota || '').trim()) {
    errors.numero_nota = 'Número da nota é obrigatório.'
  }

  if (!String(form.serie_nota || '').trim()) {
    errors.serie_nota = 'Série é obrigatória.'
  }

  if (!String(form.data_compra || '').trim()) {
    errors.data_compra = 'Data da compra é obrigatória.'
  }

  const chave = digitsOnly(String(form.chave_nfe || ''))
  if (chave.length !== 44) {
    errors.chave_nfe = 'Chave NFe inválida. Informe exatamente 44 dígitos.'
  }

  if (!form.produtos.length || !form.produtos.some((produto) => String(produto.nome || '').trim())) {
    errors.produtos = 'Adicione ao menos um produto válido.'
  }

  return Object.keys(errors).length === 0
}

const buscarContato = (value: string) => {
  if (crmSearchTimer) {
    clearTimeout(crmSearchTimer)
  }

  const termo = value.trim()
  if (termo.length < 2) {
    crmStore.clearContatos()
    return
  }

  crmSearchTimer = setTimeout(() => {
    crmStore.fetchContatos(termo)
  }, 250)
}

const atualizarNomeCliente = (value: string) => {
  form.nome_cliente = value

  const nomeAtual = value.trim()
  const nomeSelecionado = crmStore.contatos.find(contato => contato.contato_id === form.contato_id)?.nome

  if (!nomeAtual) {
    form.contato_id = undefined
    crmStore.clearContatos()
    return
  }

  if (!nomeSelecionado || String(nomeSelecionado).trim() !== nomeAtual) {
    form.contato_id = undefined
  }
}

const selecionarContato = (contato: CrmContato) => {
  form.contato_id = contato.contato_id
  form.nome_cliente = String(contato.nome || contato.contato_id || '').trim()

  const telefoneInferido = digitsOnly(contato.contato_id)
  if (telefoneInferido.length >= 10 && telefoneInferido.length <= 13) {
    form.telefone_cliente = formatPhone(contato.contato_id)
  }

  crmStore.clearContatos()
}

const selecionarImagem = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    imageDataUrl.value = ''
    return
  }

  const reader = new FileReader()
  imageDataUrl.value = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler imagem'))
    reader.readAsDataURL(file)
  })
}

const normalizeProduto = (produto: NotaProduto): NotaProduto => {
  const quantidade = toNumber(produto.quantidade)
  const valorUnitario = toNumber(produto.valor_unitario)
  return {
    ...produto,
    nome: String(produto.nome || '').trim(),
    quantidade,
    valor_unitario: valorUnitario,
    valor_total: quantidade * valorUnitario,
  }
}

const analisarImagem = async () => {
  if (!imageDataUrl.value) {
    return
  }

  const response = await notasStore.extractNota(imageDataUrl.value)
  if (!response) {
    return
  }

  form.nome_cliente = String(response.draft.nome_cliente || '').trim()
  form.telefone_cliente = formatPhone(String(response.draft.telefone_cliente || ''))
  form.documento_cliente = formatDocument(String(response.draft.documento_cliente || ''))
  form.numero_nota = String(response.draft.numero_nota || '').trim()
  form.serie_nota = String(response.draft.serie_nota || '1').trim() || '1'
  form.chave_nfe = digitsOnly(String(response.draft.chave_nfe || ''))
  form.data_compra = String(response.draft.data_compra || '').trim()
  form.observacoes = String(response.draft.observacoes || '').trim()
  form.desconto_total = toNumber(response.draft.desconto_total)
  form.produtos = Array.isArray(response.draft.produtos) ? response.draft.produtos.map(normalizeProduto) : []
  form.valor_total = totalProdutos.value
  ensureWarningInObservacoes()

  resetErrors()
  for (const field of response.missingFields || []) {
    errors[field] = 'Campo obrigatório não identificado pela IA. Confira manualmente.'
  }
}

const addProduto = () => {
  form.produtos.push({
    nome: '',
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0,
  })
}

const removeProduto = (index: number) => {
  form.produtos.splice(index, 1)
}

const updateProduto = (payload: { index: number; field: keyof NotaProduto; value: string }) => {
  const item = form.produtos[payload.index]
  if (!item) {
    return
  }

  if (payload.field === 'id_produto_estoque') {
    const idNormalizado = String(payload.value || '').replace(/\D/g, '')
    ;(item[payload.field] as number | undefined) = idNormalizado ? Number(idNormalizado) : undefined
  }
  else if (payload.field === 'quantidade' || payload.field === 'valor_unitario' || payload.field === 'confidence') {
    ;(item[payload.field] as number) = toNumber(payload.value)

    if (payload.field === 'quantidade' || payload.field === 'valor_unitario') {
      item.valor_total = toNumber(item.quantidade) * toNumber(item.valor_unitario)
    }
  }
  else {
    ;(item[payload.field] as string) = payload.value
  }

  form.valor_total = totalProdutos.value
  ensureWarningInObservacoes()
}

const saveNota = async () => {
  ensureWarningInObservacoes()
  form.valor_total = totalProdutos.value

  if (!validateForm() || duplicateNota.value) {
    return
  }

  const payload: NotaRetiradaDraft = {
    ...form,
    telefone_cliente: digitsOnly(String(form.telefone_cliente || '')),
    documento_cliente: digitsOnly(String(form.documento_cliente || '')),
    chave_nfe: digitsOnly(String(form.chave_nfe || '')),
    foto_cupom_data_url: imageDataUrl.value,
    produtos: form.produtos.map(normalizeProduto),
    valor_total: totalProdutos.value,
    desconto_total: descontoTotalNumber.value,
    observacoes: String(form.observacoes || '').trim(),
  }

  const response = await notasStore.createNota(payload)
  if (!response?.nota) {
    return
  }

  createdNota.value = {
    id: response.nota.id,
    numero_nota: response.nota.numero_nota,
    serie_nota: response.nota.serie_nota,
  }
  successModalOpen.value = true
}

const cadastrarOutra = async () => {
  successModalOpen.value = false
  createdNota.value = null
  imageDataUrl.value = ''
  form.contato_id = undefined
  form.telefone_cliente = ''
  form.documento_cliente = ''
  form.nome_cliente = ''
  form.numero_nota = ''
  form.serie_nota = '1'
  form.chave_nfe = ''
  form.data_compra = ''
  form.observacoes = ''
  form.produtos = []
  form.valor_total = 0
  form.desconto_total = 0
  resetErrors()
  crmStore.clearContatos()
  await notasStore.fetchNotas()
}

await notasStore.fetchNotas()
</script>

<template>
  <AppPageShell
    eyebrow="Cadastro"
    title="Cadastrar nota de retirada"
    description="Capture o cupom, valide os dados extraídos pela IA e registre a nota com segurança."
  >
    <div class="space-y-6">
      <NotaCadastroCaptura
        :preview-url="imageDataUrl"
        :loading="notasStore.extractingNota"
        @select-image="selecionarImagem"
        @analyze="analisarImagem"
      />

      <NotaCadastroCliente
        :nome-cliente="form.nome_cliente"
        :telefone-cliente="form.telefone_cliente || ''"
        :documento-cliente="form.documento_cliente || ''"
        :contatos="crmStore.contatos"
        :loading-search="crmStore.loadingContatos"
        :show-suggestions="showCrmSuggestions"
        :show-no-results="showCrmNoResults"
        :errors="errors"
        @update:nome-cliente="atualizarNomeCliente"
        @update:telefone-cliente="form.telefone_cliente = formatPhone($event)"
        @update:documento-cliente="form.documento_cliente = formatDocument($event)"
        @search-contato="buscarContato"
        @select-contato="selecionarContato"
      />

      <NotaCadastroFiscal
        :numero-nota="form.numero_nota"
        :serie-nota="form.serie_nota || '1'"
        :chave-nfe="String(form.chave_nfe || '')"
        :data-compra="form.data_compra"
        :valor-total="totalProdutos.toFixed(2)"
        :desconto-total="String(form.desconto_total ?? '')"
        :valor-liquido="valorLiquido.toFixed(2)"
        :observacoes="String(form.observacoes || '')"
        :errors="errors"
        @update:numero-nota="form.numero_nota = $event"
        @update:serie-nota="form.serie_nota = $event"
        @update:chave-nfe="form.chave_nfe = digitsOnly($event)"
        @update:data-compra="form.data_compra = $event"
        @update:desconto-total="form.desconto_total = toNumber($event)"
        @update:observacoes="form.observacoes = $event"
      />

      <NotaCadastroProdutos
        :produtos="form.produtos"
        :errors="errors"
        @add-produto="addProduto"
        @remove-produto="removeProduto"
        @update-produto="updateProduto"
      />

      <NotaCadastroResumo
        :duplicate-nota="duplicateNota"
        :loading="notasStore.creatingNota"
        :error-message="notasStore.errorMessage"
        @save="saveNota"
      />
    </div>

    <ModalGlobal v-model="successModalOpen" title="Nota salva com sucesso" max-width-class="max-w-md">
      <div class="space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <p v-if="createdNota">
          A nota {{ createdNota.serie_nota }}-{{ createdNota.numero_nota }} foi cadastrada com sucesso.
        </p>
      </div>
      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            @click="cadastrarOutra"
          >
            Cadastrar outra
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-500"
            @click="router.push('/notas')"
          >
            Ir para listagem
          </button>
        </div>
      </template>
    </ModalGlobal>
  </AppPageShell>
</template>
