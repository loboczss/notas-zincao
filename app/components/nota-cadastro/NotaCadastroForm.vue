<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Botao from '../Botao.vue'
import Dropmenu from '../Dropmenu.vue'
import Input from '../Input.vue'
import NotaCampo from './NotaCampo.vue'
import NotaSectionCard from './NotaSectionCard.vue'
import NotaUploadImagem from './NotaUploadImagem.vue'
import type { NotaMissingField, NotaProduto, NotaRetiradaDraft } from '../../../shared/types/NotasRetirada'
import type { CrmContato } from '../../../shared/types/CRM'
import { useCrmStore } from '../../stores'

type ProdutoFormItem = {
  nome: string
  quantidade: string
  unidade: string
  valor_unitario: string
}

const emit = defineEmits<{
  salva: []
}>()

const carregandoIA = ref(false)
const salvando = ref(false)
const erro = ref('')
const sucesso = ref('')
const cupomImageDataUrl = ref('')
const clienteImageDataUrl = ref('')
const crmBusca = ref('')
const contatoSelecionadoId = ref('')
let crmSearchDebounce: ReturnType<typeof setTimeout> | null = null

const form = ref<NotaRetiradaDraft>({
  contato_id: undefined,
  nome_cliente: '',
  documento_cliente: '',
  telefone_cliente: '',
  numero_nota: '',
  serie_nota: '1',
  chave_nfe: '',
  data_compra: '',
  data_prevista_retirada: '',
  observacoes: '',
  status_retirada: 'pendente',
  produtos: [],
  valor_total: null,
  foto_url: undefined,
  foto_cliente_url: undefined,
  foto_cupom_data_url: undefined,
  foto_cliente_data_url: undefined,
})

const valorTotalInput = ref('')
const crmStore = useCrmStore()
const { contatos, loadingContatos, errorMessage: crmErrorMessage } = storeToRefs(crmStore)

const unidadeOptions = [
  { label: 'Unidade (un)', value: 'un' },
  { label: 'Metro (m)', value: 'm' },
  { label: 'Metro quadrado (m²)', value: 'm2' },
  { label: 'Metro cúbico (m³)', value: 'm3' },
  { label: 'Quilo (kg)', value: 'kg' },
  { label: 'Grama (g)', value: 'g' },
  { label: 'Litro (L)', value: 'l' },
  { label: 'Caixa (cx)', value: 'cx' },
  { label: 'Pacote (pct)', value: 'pct' },
]

const statusOptions = [
  { label: 'Pendente', value: 'pendente' },
  { label: 'Parcial', value: 'parcial' },
  { label: 'Retirada', value: 'retirada' },
  { label: 'Cancelada', value: 'cancelada' },
]

const normalizeUnidade = (value: string | undefined) => {
  const normalized = String(value || '').trim().toLowerCase()
  const found = unidadeOptions.find(item => item.value === normalized)
  return found ? found.value : 'un'
}

const produtos = ref<ProdutoFormItem[]>([
  { nome: '', quantidade: '', unidade: 'un', valor_unitario: '' },
])
const missingFields = ref<NotaMissingField[]>([])

const parseNumber = (value: string) => {
  const normalized = value.replace(',', '.').trim()

  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseProdutos = (): NotaProduto[] => {
  return produtos.value
    .map((item) => {
      const nome = item.nome.trim()

      if (!nome) {
        return null
      }

      const quantidade = parseNumber(item.quantidade)
      const valorUnitario = parseNumber(item.valor_unitario)
      const unidade = item.unidade.trim()

      return {
        nome,
        ...(quantidade !== undefined ? { quantidade } : {}),
        ...(unidade ? { unidade } : {}),
        ...(valorUnitario !== undefined ? { valor_unitario: valorUnitario } : {}),
      }
    })
    .filter((item): item is NotaProduto => item !== null)
}

const totalProdutos = computed(() => {
  return produtos.value.reduce((acc, item) => {
    const qtd = parseNumber(item.quantidade) || 0
    const unit = parseNumber(item.valor_unitario) || 0
    return acc + (qtd * unit)
  }, 0)
})

const podeSalvar = computed(() => {
  return !salvando.value && getMissingFromForm().length === 0
})

const mostrarSugestoesCRM = computed(() => {
  return crmBusca.value.trim().length > 0 && (loadingContatos.value || contatos.value.length > 0)
})

const adicionarProduto = () => {
  produtos.value.push({ nome: '', quantidade: '', unidade: 'un', valor_unitario: '' })
}

const removerProduto = (index: number) => {
  if (produtos.value.length === 1) {
    produtos.value[0] = { nome: '', quantidade: '', unidade: 'un', valor_unitario: '' }
    return
  }

  produtos.value.splice(index, 1)
}

const limparFormulario = () => {
  form.value = {
    contato_id: undefined,
    nome_cliente: '',
    documento_cliente: '',
    telefone_cliente: '',
    numero_nota: '',
    serie_nota: '1',
    chave_nfe: '',
    data_compra: '',
    data_prevista_retirada: '',
    observacoes: '',
    status_retirada: 'pendente',
    produtos: [],
    valor_total: null,
    foto_url: undefined,
    foto_cliente_url: undefined,
    foto_cupom_data_url: undefined,
    foto_cliente_data_url: undefined,
  }

  crmBusca.value = ''
  contatoSelecionadoId.value = ''
  valorTotalInput.value = ''
  cupomImageDataUrl.value = ''
  clienteImageDataUrl.value = ''
  produtos.value = [{ nome: '', quantidade: '', unidade: 'un', valor_unitario: '' }]
  missingFields.value = []
}

const getMissingFromForm = (): NotaMissingField[] => {
  const missing: NotaMissingField[] = []

  if (!form.value.nome_cliente.trim()) missing.push('nome_cliente')
  if (!String(form.value.telefone_cliente || '').trim()) missing.push('telefone_cliente')
  if (!form.value.numero_nota.trim()) missing.push('numero_nota')
  if (!form.value.serie_nota.trim()) missing.push('serie_nota')
  if (!form.value.data_compra.trim()) missing.push('data_compra')
  if (parseProdutos().length === 0) missing.push('produtos')

  return missing
}

const isMissing = (field: NotaMissingField) => {
  return missingFields.value.includes(field)
}

const selecionarContatoCRM = (contato: CrmContato) => {
  const nomeContato = String(contato.nome || '').trim()

  if (nomeContato) {
    form.value.nome_cliente = nomeContato
  }

  form.value.contato_id = contato.contato_id
  form.value.telefone_cliente = contato.contato_id.includes('@') ? form.value.telefone_cliente : contato.contato_id
  contatoSelecionadoId.value = contato.contato_id
  crmBusca.value = nomeContato || contato.contato_id
}

watch(() => form.value.nome_cliente, (novoNome) => {
  if (!contatoSelecionadoId.value) {
    return
  }

  const selecionado = contatos.value.find(item => item.contato_id === contatoSelecionadoId.value)
  const nomeSelecionado = String(selecionado?.nome || '').trim()

  if (!nomeSelecionado || nomeSelecionado !== novoNome.trim()) {
    contatoSelecionadoId.value = ''
    form.value.contato_id = undefined
  }
})

watch(crmBusca, (valor) => {
  if (crmSearchDebounce) {
    clearTimeout(crmSearchDebounce)
  }

  const termo = valor.trim()

  if (!termo) {
    contatos.value = []
    return
  }

  crmSearchDebounce = setTimeout(async () => {
    await crmStore.fetchContatos(termo)
  }, 200)
})

onBeforeUnmount(() => {
  if (crmSearchDebounce) {
    clearTimeout(crmSearchDebounce)
  }
})

const onUploadInvalido = () => {
  erro.value = 'Selecione um arquivo de imagem válido.'
}

const onCupomImageUpdate = async (value: string) => {
  cupomImageDataUrl.value = value

  if (!value) {
    return
  }

  await preencherComIA()
}

const preencherComIA = async () => {
  erro.value = ''
  sucesso.value = ''

  if (!cupomImageDataUrl.value) {
    erro.value = 'Envie a foto da nota para preencher automaticamente.'
    return
  }

  carregandoIA.value = true

  try {
    const data = await $fetch<{
      draft: NotaRetiradaDraft
      missingFields: NotaMissingField[]
    }>('/api/openai/extract-nota', {
      method: 'POST',
      body: {
        imageDataUrl: cupomImageDataUrl.value,
      },
    })

    form.value = {
      ...form.value,
      ...data.draft,
      foto_cupom_data_url: cupomImageDataUrl.value,
      foto_cliente_data_url: clienteImageDataUrl.value || undefined,
    }

    valorTotalInput.value = data.draft.valor_total !== undefined && data.draft.valor_total !== null
      ? String(data.draft.valor_total)
      : ''

    produtos.value = data.draft.produtos.length > 0
      ? data.draft.produtos.map(item => ({
        nome: item.nome || '',
        quantidade: item.quantidade !== undefined ? String(item.quantidade) : '',
        unidade: normalizeUnidade(item.unidade),
        valor_unitario: item.valor_unitario !== undefined ? String(item.valor_unitario) : '',
      }))
      : [{ nome: '', quantidade: '', unidade: 'un', valor_unitario: '' }]

    missingFields.value = data.missingFields
  }
  catch (error) {
    erro.value = error instanceof Error ? error.message : 'Não foi possível extrair os dados da nota.'
  }
  finally {
    carregandoIA.value = false
  }
}

const salvarNota = async () => {
  erro.value = ''
  sucesso.value = ''

  const missing = getMissingFromForm()
  missingFields.value = missing

  if (missing.length > 0) {
    erro.value = 'Preencha os campos obrigatórios em vermelho antes de salvar.'
    return
  }

  if (!cupomImageDataUrl.value) {
    erro.value = 'A foto do cupom é obrigatória para salvar.'
    return
  }

  salvando.value = true

  try {
    const payload: NotaRetiradaDraft = {
      ...form.value,
      produtos: parseProdutos(),
      valor_total: parseNumber(valorTotalInput.value) ?? null,
      foto_cupom_data_url: cupomImageDataUrl.value,
      foto_cliente_data_url: clienteImageDataUrl.value || undefined,
    }

    await $fetch('/api/notas/create', {
      method: 'POST',
      body: payload,
    })

    sucesso.value = 'Nota salva com sucesso.'
    missingFields.value = []
    emit('salva')
  }
  catch (error) {
    erro.value = error instanceof Error ? error.message : 'Falha ao salvar nota.'
  }
  finally {
    salvando.value = false
  }
}
</script>

<template>
  <section class="space-y-5 pb-24 md:space-y-6 md:pb-20">
    <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div class="flex flex-col gap-2">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Etapa principal
          </p>
          <h2 class="text-lg font-bold text-slate-900">
            Foto do cupom + Preenchimento por IA
          </h2>
          <p class="text-sm text-slate-600">
            Ao enviar a foto do cupom, a IA preenche cliente, nota, produtos e valores automaticamente.
          </p>
        </div>
      </div>

      <div class="mt-4">
        <NotaUploadImagem
          id="nota-foto"
          label="Foto do cupom"
          :required="true"
          :prominent="true"
          :show-source-options="true"
          :model-value="cupomImageDataUrl"
          @update:model-value="onCupomImageUpdate"
          @invalid-file="onUploadInvalido"
        >
          <template #extra>
            <div class="pt-2">
              <Botao variant="primary" :disabled="carregandoIA || !cupomImageDataUrl" class="w-full sm:w-auto" @click="preencherComIA">
                {{ carregandoIA ? 'Analisando cupom...' : 'Reprocessar com IA' }}
              </Botao>
            </div>
          </template>
        </NotaUploadImagem>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
      <div class="space-y-5 lg:space-y-6 xl:col-span-8">
        <NotaSectionCard title="Dados do Cliente" icon="person">
          <div class="mb-5 space-y-2">
            <NotaCampo label="Buscar cliente no CRM">
              <Input v-model="crmBusca" placeholder="Digite nome, contato_id ou email" />
            </NotaCampo>

            <div v-if="mostrarSugestoesCRM" class="max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
              <p v-if="loadingContatos" class="px-2 py-1 text-xs text-slate-500">
                Buscando contatos...
              </p>
              <button
                v-for="contato in contatos"
                :key="contato.contato_id"
                type="button"
                class="mb-1 w-full rounded-lg border px-3 py-2 text-left text-sm transition last:mb-0"
                :class="contatoSelecionadoId === contato.contato_id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'"
                @click="selecionarContatoCRM(contato)"
              >
                <span class="block truncate font-medium">{{ contato.nome || 'Sem nome' }}</span>
                <span class="mt-0.5 block truncate text-xs text-slate-500">{{ contato.contato_id }}</span>
              </button>
            </div>

            <p v-if="crmErrorMessage" class="text-sm font-medium text-red-600">
              {{ crmErrorMessage }}
            </p>

            <p v-if="form.contato_id" class="text-xs font-medium text-blue-700">
              contato_id vinculado: {{ form.contato_id }}
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NotaCampo label="Nome do cliente" required :error="isMissing('nome_cliente')">
              <Input v-model="form.nome_cliente" :class="isMissing('nome_cliente') ? 'border-red-500' : ''" placeholder="Digite o nome completo" />
            </NotaCampo>

            <NotaCampo label="Documento (CPF/CNPJ)">
              <Input v-model="form.documento_cliente" placeholder="000.000.000-00" />
            </NotaCampo>

            <NotaCampo label="Telefone" required :error="isMissing('telefone_cliente')">
              <Input v-model="form.telefone_cliente" :class="isMissing('telefone_cliente') ? 'border-red-500' : ''" placeholder="(00) 00000-0000" />
            </NotaCampo>

            <NotaUploadImagem
              id="cliente-foto"
              label="Foto do cliente"
              :model-value="clienteImageDataUrl"
              @update:model-value="clienteImageDataUrl = $event"
              @invalid-file="onUploadInvalido"
            />
          </div>
        </NotaSectionCard>

        <NotaSectionCard title="Dados da Nota Fiscal" icon="description">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <NotaCampo label="Número da nota" required :error="isMissing('numero_nota')">
              <Input v-model="form.numero_nota" :class="isMissing('numero_nota') ? 'border-red-500' : ''" />
            </NotaCampo>

            <NotaCampo label="Série" required :error="isMissing('serie_nota')">
              <Input v-model="form.serie_nota" :class="isMissing('serie_nota') ? 'border-red-500' : ''" />
            </NotaCampo>

            <NotaCampo label="Status inicial">
              <Dropmenu v-model="form.status_retirada" :options="statusOptions" />
            </NotaCampo>
          </div>

          <div class="mt-4">
            <NotaCampo label="Chave NFe">
              <Input v-model="form.chave_nfe" placeholder="44 dígitos" />
            </NotaCampo>
          </div>
        </NotaSectionCard>

        <NotaSectionCard title="Produtos" icon="inventory_2">
          <div class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p class="text-sm text-slate-600">
              Adicione os itens da nota para cálculo e retirada.
            </p>
            <Botao variant="secondary" class="w-full sm:w-auto" @click="adicionarProduto">
              Adicionar item
            </Botao>
          </div>

          <div class="space-y-3 rounded-xl border p-3" :class="isMissing('produtos') ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'">
            <div
              v-for="(produto, index) in produtos"
              :key="index"
              class="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]"
            >
              <Input v-model="produto.nome" placeholder="Item" />
              <Input v-model="produto.quantidade" type="number" min="0" step="0.01" placeholder="Qtd" />
              <Dropmenu v-model="produto.unidade" :options="unidadeOptions" placeholder="Unidade" />
              <Input v-model="produto.valor_unitario" type="number" min="0" step="0.01" placeholder="V. unitário" />
              <Botao variant="secondary" class="w-full xl:w-auto" @click="removerProduto(index)">
                Remover
              </Botao>
            </div>
          </div>
        </NotaSectionCard>
      </div>

      <aside class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:col-span-4 xl:grid-cols-1">
        <NotaSectionCard title="Prazos" icon="calendar_today">
          <div class="space-y-4">
            <NotaCampo label="Data da compra" required :error="isMissing('data_compra')">
              <Input v-model="form.data_compra" type="date" :class="isMissing('data_compra') ? 'border-red-500' : ''" />
            </NotaCampo>

            <NotaCampo label="Data prevista de retirada">
              <Input v-model="form.data_prevista_retirada" type="date" />
            </NotaCampo>
          </div>
        </NotaSectionCard>

        <NotaSectionCard title="Financeiro e Observações" icon="payments">
          <div class="space-y-4">
            <div class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-xs uppercase tracking-wider text-slate-500">
                Valor total
              </p>
              <Input v-model="valorTotalInput" type="number" min="0" step="0.01" class="mt-2" />
              <p class="mt-2 text-xs text-slate-600">
                Total estimado pelos itens: R$ {{ totalProdutos.toFixed(2) }}
              </p>
            </div>

            <NotaCampo label="Observações">
              <textarea
                v-model="form.observacoes"
                rows="4"
                class="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                placeholder="Instruções especiais para retirada"
              />
            </NotaCampo>
          </div>
        </NotaSectionCard>

        <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Confira a chave NFe e os dados do cliente para evitar divergências na retirada.
        </div>
      </aside>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <p v-if="missingFields.length > 0" class="text-sm font-medium text-red-600">
        Campos em vermelho precisam ser preenchidos para salvar.
      </p>
      <p v-if="erro" class="mt-1 text-sm font-medium text-red-600">
        {{ erro }}
      </p>
      <p v-if="sucesso" class="mt-1 text-sm font-medium text-emerald-600">
        {{ sucesso }}
      </p>
    </div>

    <nav class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:sticky md:inset-auto md:rounded-t-xl md:border md:border-slate-200">
      <div class="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:justify-end">
        <Botao variant="secondary" :disabled="salvando" class="w-full sm:w-auto" @click="limparFormulario">
          Cancelar
        </Botao>
        <Botao variant="primary" :disabled="!podeSalvar" class="w-full sm:w-auto" @click="salvarNota">
          {{ salvando ? 'Salvando...' : 'Salvar nota' }}
        </Botao>
      </div>
    </nav>
  </section>
</template>
