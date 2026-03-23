<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Botao from '../Botao.vue'
import Input from '../Input.vue'
import Dropmenu from '../Dropmenu.vue'
import ModalGlobal from '../ModalGlobal.vue'
import type { NotaRegistrarRetiradaRequest, NotaRetiradaDetalheItem, NotaRetiradaStatus } from '../../../shared/types/NotasRetirada'
import NotasFiltro from '../notas-lista/NotasFiltro.vue'
import type { NotasFiltroState } from '../notas-lista/NotasFiltro.vue'
import { useNotasStore } from '../../stores'

type ProdutoRetiradaForm = {
  nome: string
  quantidade: number
  unidade: string
  quantidade_retirada: string
}

const notasStore = useNotasStore()
const { notasRetirada, loadingRetirada, savingRetirada, errorMessage } = storeToRefs(notasStore)

const sucesso = ref('')
const notaSelecionadaId = ref('')
const produtosForm = ref<ProdutoRetiradaForm[]>([])
const fotoRetiradaDataUrl = ref('')
const observacoes = ref('')
const filtros = ref<NotasFiltroState>({
  nome: '',
  numero: '',
  data: '',
  valor: '',
  produto: '',
})
const statusSelecionado = ref<NotaRetiradaStatus | ''>('')
const fotoModalAberto = ref(false)
const fotoModalUrl = ref('')
const fotoModalTitulo = ref('Foto da nota')

const statusLabels: Record<NotaRetiradaStatus, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  retirada: 'Retirada completa',
  cancelada: 'Cancelada',
}

const statusOptions = computed(() => [
  { label: statusLabels.pendente, value: 'pendente' },
  { label: statusLabels.parcial, value: 'parcial' },
  { label: statusLabels.retirada, value: 'retirada' },
  { label: statusLabels.cancelada, value: 'cancelada' },
])

const notasFiltradas = computed(() => {
  const nome = filtros.value.nome.trim().toLowerCase()
  const numero = filtros.value.numero.trim().toLowerCase()
  const data = filtros.value.data.trim()
  const valor = filtros.value.valor.trim().replace(',', '.')
  const produto = filtros.value.produto.trim().toLowerCase()

  return notasRetirada.value.filter((item) => {
    const matchNome = !nome || item.nome_cliente.toLowerCase().includes(nome)
    const matchNumero = !numero || item.numero_nota.toLowerCase().includes(numero)
    const matchData = !data || item.data_compra === data

    const matchValor = !valor || (() => {
      if (item.valor_total === null) {
        return false
      }

      const raw = String(item.valor_total)
      const rawFixed = item.valor_total.toFixed(2)
      return raw.includes(valor) || rawFixed.includes(valor)
    })()

    const matchProduto = !produto || (item.produtos || []).some(prod =>
      String(prod.nome || '').toLowerCase().includes(produto),
    )

    return matchNome && matchNumero && matchData && matchValor && matchProduto
  })
})

const notaSelecionada = computed(() => {
  return notasRetirada.value.find(item => item.id === notaSelecionadaId.value) || null
})

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('pt-BR')
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('pt-BR')
}

const totais = computed(() => {
  const total = produtosForm.value.reduce((acc, item) => acc + (item.quantidade || 0), 0)
  const retirado = produtosForm.value.reduce((acc, item) => {
    const raw = Number(item.quantidade_retirada)
    return acc + (Number.isFinite(raw) ? raw : 0)
  }, 0)

  return { total, retirado }
})

const statusCalculadoRetirada = computed(() => {
  const itensComRetirada = produtosForm.value.filter((item) => Number(item.quantidade_retirada) > 0)
  if (itensComRetirada.length === 0) {
    return 'pendente'
  }

  const todosCompletos = produtosForm.value.every((item) => {
    const retirada = Number(item.quantidade_retirada)
    return Number.isFinite(retirada) && retirada >= item.quantidade
  })

  return todosCompletos ? 'retirada' : 'parcial'
})

const statusAposSalvarLabel = computed(() => statusLabels[statusCalculadoRetirada.value])

const normalizarProdutosDaNota = (nota: NotaRetiradaDetalheItem) => {
  produtosForm.value = (nota.produtos || []).map(item => ({
    nome: item.nome,
    quantidade: Number(item.quantidade ?? 1),
    unidade: String(item.unidade || ''),
    quantidade_retirada: String(item.quantidade_retirada ?? 0),
  }))
}

const selecionarNota = (notaId: string) => {
  notasStore.clearError()
  sucesso.value = ''

  notaSelecionadaId.value = notaId

  if (!notaSelecionada.value) {
    produtosForm.value = []
    statusSelecionado.value = ''
    return
  }

  normalizarProdutosDaNota(notaSelecionada.value)
  statusSelecionado.value = notaSelecionada.value.status_retirada
}

const carregarNotas = async (opts?: { preserveSuccess?: boolean }) => {
  notasStore.clearError()

  if (!opts?.preserveSuccess) {
    sucesso.value = ''
  }

  const data = await notasStore.fetchNotasRetirada()

  if (data.length === 0) {
    notaSelecionadaId.value = ''
    produtosForm.value = []
    statusSelecionado.value = ''
    return
  }

  const selecionadaExiste = data.some(item => item.id === notaSelecionadaId.value)

  if (!selecionadaExiste) {
    notaSelecionadaId.value = ''
    produtosForm.value = []
    statusSelecionado.value = ''
  }
}

const onFotoRetiradaChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    fotoRetiradaDataUrl.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    notasStore.errorMessage = 'Selecione uma imagem válida para comprovar a retirada.'
    return
  }

  notasStore.clearError()

  fotoRetiradaDataUrl.value = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler foto da retirada.'))
    reader.readAsDataURL(file)
  })
}

const registrarRetirada = async () => {
  notasStore.clearError()
  sucesso.value = ''

  if (!notaSelecionada.value) {
    notasStore.errorMessage = 'Selecione uma nota para registrar retirada.'
    return
  }

  const statusAlterado = !!statusSelecionado.value && statusSelecionado.value !== notaSelecionada.value.status_retirada

  if (!fotoRetiradaDataUrl.value) {
    if (statusAlterado) {
      await alterarStatus(statusSelecionado.value as NotaRetiradaStatus)
      return
    }

    notasStore.errorMessage = 'A foto do cliente retirando é obrigatória.'
    return
  }

  const produtosRetirada = produtosForm.value
    .map(item => ({
      nome: item.nome,
      quantidade_retirada: Number(item.quantidade_retirada),
    }))
    .filter(item => Number.isFinite(item.quantidade_retirada) && item.quantidade_retirada >= 0)

  if (produtosRetirada.length === 0) {
    notasStore.errorMessage = 'Informe ao menos um produto com quantidade de retirada.'
    return
  }

  const payload: NotaRegistrarRetiradaRequest = {
    produtos_retirada: produtosRetirada,
    foto_cliente_retirada_data_url: fotoRetiradaDataUrl.value,
    observacoes: observacoes.value || undefined,
  }

  const response = await notasStore.registrarRetirada(notaSelecionada.value.id, payload)

  if (response) {
    if (statusAlterado) {
      await alterarStatus(statusSelecionado.value as NotaRetiradaStatus)
      return
    }

    sucesso.value = `Dados salvos com sucesso. Status atual: ${statusAposSalvarLabel.value}.`
    fotoRetiradaDataUrl.value = ''
    observacoes.value = ''
    await carregarNotas({ preserveSuccess: true })
  }
}

const alterarStatus = async (status: NotaRetiradaStatus) => {
  notasStore.clearError()

  if (!notaSelecionada.value) {
    notasStore.errorMessage = 'Selecione uma nota para atualizar o status.'
    return
  }

  const response = await notasStore.atualizarStatusNota(notaSelecionada.value.id, status, observacoes.value || undefined)

  if (response) {
    sucesso.value = `Status atualizado para ${statusLabels[status]}.`
    await carregarNotas({ preserveSuccess: true })
    if (notaSelecionada.value) {
      statusSelecionado.value = notaSelecionada.value.status_retirada
    }
  }
}

onMounted(() => {
  carregarNotas()
})

const abrirFoto = (url?: string | null, titulo = 'Foto da nota') => {
  if (!url) {
    return
  }

  fotoModalUrl.value = url
  fotoModalTitulo.value = titulo
  fotoModalAberto.value = true
}

const fecharFotoModal = () => {
  fotoModalAberto.value = false
  fotoModalUrl.value = ''
}

watch(notasRetirada, (lista) => {
  if (lista.length === 0) {
    notaSelecionadaId.value = ''
    produtosForm.value = []
    statusSelecionado.value = ''
    return
  }

  const selecionadaAindaExiste = lista.some(item => item.id === notaSelecionadaId.value)

  if (!selecionadaAindaExiste && notaSelecionadaId.value) {
    notaSelecionadaId.value = ''
    produtosForm.value = []
    statusSelecionado.value = ''
  }
})

watch(notasFiltradas, (lista) => {
  if (lista.length === 0) {
    notaSelecionadaId.value = ''
    produtosForm.value = []
    statusSelecionado.value = ''
    return
  }

  const selecionadaAindaExiste = lista.some(item => item.id === notaSelecionadaId.value)

  if (!selecionadaAindaExiste && notaSelecionadaId.value) {
    notaSelecionadaId.value = ''
    produtosForm.value = []
    statusSelecionado.value = ''
  }
})
</script>

<template>
  <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6 lg:p-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <h2 class="text-xl font-semibold text-slate-900">
        Retirada de produtos da nota
      </h2>

      <Botao variant="secondary" class="w-full sm:w-auto" :disabled="loadingRetirada" @click="carregarNotas">
        {{ loadingRetirada ? 'Atualizando...' : 'Atualizar notas' }}
      </Botao>
    </div>

    <p class="mt-2 text-sm text-slate-600">
      Registre retirada parcial ou completa e anexe foto do cliente retirando os produtos.
    </p>

    <div class="mt-4 space-y-4">
      <NotasFiltro v-model="filtros" />

      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p class="text-sm font-semibold text-slate-800">
          Selecione uma nota para retirada
        </p>

        <div class="mt-3 space-y-2">
          <p v-if="notasRetirada.length === 0" class="text-sm text-slate-500">
            Nenhuma nota pendente/parcial disponível.
          </p>
          <p v-else-if="notasFiltradas.length === 0" class="text-sm text-slate-500">
            Nenhuma nota encontrada para os filtros informados.
          </p>

          <button
            v-for="nota in notasFiltradas"
            :key="nota.id"
            type="button"
            class="w-full rounded-lg border px-3 py-2 text-left text-sm transition"
            :class="notaSelecionadaId === nota.id
              ? 'border-blue-500 bg-blue-50 text-blue-900'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
            @click="selecionarNota(nota.id)"
          >
            <span class="block font-medium">{{ nota.numero_nota }} - {{ nota.nome_cliente }}</span>
            <span class="mt-1 block text-slate-500">{{ statusLabels[nota.status_retirada] }} • Compra: {{ formatDate(nota.data_compra) }}</span>
          </button>
        </div>
      </div>

      <div v-if="notaSelecionada" class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <div class="grid gap-3 sm:grid-cols-2">
          <p><span class="font-semibold">Cliente:</span> {{ notaSelecionada.nome_cliente }}</p>
          <p><span class="font-semibold">Nota:</span> {{ notaSelecionada.numero_nota }} / Série {{ notaSelecionada.serie_nota }}</p>
          <p><span class="font-semibold">Status atual:</span> {{ statusLabels[notaSelecionada.status_retirada] }}</p>
          <p><span class="font-semibold">Data da retirada:</span> {{ formatDateTime(notaSelecionada.data_retirada) }}</p>
        </div>

        <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Botao variant="secondary" class="w-full sm:w-auto" :disabled="!notaSelecionada.foto_url" @click="abrirFoto(notaSelecionada.foto_url, 'Foto do cupom')">
            Ver foto do cupom
          </Botao>
          <Botao variant="secondary" class="w-full sm:w-auto" :disabled="!notaSelecionada.foto_cliente_url" @click="abrirFoto(notaSelecionada.foto_cliente_url, 'Foto cliente cadastro')">
            Ver foto cliente cadastro
          </Botao>
          <Botao variant="secondary" class="w-full sm:w-auto" :disabled="!notaSelecionada.comprovante_retirada_url" @click="abrirFoto(notaSelecionada.comprovante_retirada_url, 'Foto da última retirada')">
            Ver foto última retirada
          </Botao>
        </div>

        <div class="mt-3">
          <Dropmenu
            v-model="statusSelecionado"
            :options="statusOptions"
            placeholder="Selecione o status"
            :disabled="savingRetirada"
          />
        </div>
      </div>

      <div v-if="notaSelecionada" class="space-y-2">
        <p class="text-sm font-medium text-slate-700">
          Produtos da nota
        </p>

        <div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div
            v-for="(produto, index) in produtosForm"
            :key="`${produto.nome}-${index}`"
            class="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]"
          >
            <Input :model-value="produto.nome" disabled />
            <Input :model-value="String(produto.quantidade)" disabled />
            <Input :model-value="produto.unidade || 'un'" disabled />
            <Input v-model="produto.quantidade_retirada" type="number" min="0" step="0.01" placeholder="Qtd retirada" />
          </div>
        </div>
      </div>

      <div v-if="notaSelecionada" class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label for="foto-retirada" class="text-sm font-medium text-slate-700">Foto do cliente retirando (obrigatória)</label>
          <input
            id="foto-retirada"
            type="file"
            accept="image/*"
            class="block w-full text-sm text-slate-700 file:mb-2 file:mr-0 file:w-full file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium sm:file:mb-0 sm:file:mr-3 sm:file:w-auto"
            @change="onFotoRetiradaChange"
          >

          <div v-if="fotoRetiradaDataUrl" class="rounded-lg border border-slate-200 p-3">
            <img :src="fotoRetiradaDataUrl" alt="Preview retirada" class="max-h-44 w-full rounded-lg object-contain">
          </div>
        </div>

        <div class="space-y-2">
          <label for="retirada-observacoes" class="text-sm font-medium text-slate-700">Observações</label>
          <textarea
            id="retirada-observacoes"
            v-model="observacoes"
            rows="5"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            placeholder="Detalhes da retirada parcial/completa"
          />

          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p><span class="font-semibold">Total da nota:</span> {{ totais.total }}</p>
            <p><span class="font-semibold">Qtd retirada:</span> {{ totais.retirado }}</p>
            <p><span class="font-semibold">Status após salvar:</span> {{ statusAposSalvarLabel }}</p>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="text-sm font-medium text-red-600">
        {{ errorMessage }}
      </p>

      <p v-if="sucesso" class="text-sm font-medium text-emerald-600">
        {{ sucesso }}
      </p>

      <Botao
        v-if="notaSelecionada"
        variant="primary"
        class="w-full sm:w-auto"
        :disabled="savingRetirada"
        @click="registrarRetirada"
      >
        {{ savingRetirada ? 'Salvando...' : 'Salvar' }}
      </Botao>

      <ModalGlobal v-model="fotoModalAberto" :title="fotoModalTitulo">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <img :src="fotoModalUrl" :alt="fotoModalTitulo" class="mx-auto max-h-[70vh] w-full rounded object-contain">
        </div>

        <template #footer>
          <div class="flex justify-end">
            <Botao variant="secondary" @click="fecharFotoModal">
              Fechar
            </Botao>
          </div>
        </template>
      </ModalGlobal>
    </div>
  </section>
</template>
