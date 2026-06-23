<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Calendar,
  Camera,
  ClipboardList,
  Info,
  Phone,
  Plus,
  Trash2,
  UserRound,
  X,
} from 'lucide-vue-next'
import type { NotaAdminEditRequest, NotaRetiradaDetalheItem } from '../../../shared/types/NotasRetirada'
import type { EstoqueProduto } from '../../../shared/types/Estoque'
import NotasStatusBadge from './NotasStatusBadge.vue'
import NotaItemCard from './NotaItemCard.vue'
import NotaLogCard from './NotaLogCard.vue'
import Card from '../Card.vue'
import Botao from '../Botao.vue'
import { notaRetiradaRoute } from '../../constants/routes'
import NotasVendaFuturaBadge from './NotasVendaFuturaBadge.vue'
import { useEstoqueStore } from '../../stores'

const props = withDefaults(defineProps<{
  nota: NotaRetiradaDetalheItem | null
  isAdmin?: boolean
  savingEdit?: boolean
  showRetiradaAction?: boolean
}>(), {
  showRetiradaAction: true,
})

const emit = defineEmits<{
  (e: 'save-edit', payload: NotaAdminEditRequest): void
  (e: 'edit-mode-change', value: boolean): void
}>()

const router = useRouter()
const estoqueStore = useEstoqueStore()

const produtoLookupTimers = new Map<number, ReturnType<typeof setTimeout>>()
const produtoLookupRequestIds = ref<Record<number, number>>({})
const loadingProdutoEstoque = ref<Record<number, boolean>>({})
const produtoEstoqueError = ref<Record<number, string>>({})
let produtoLookupSeq = 0

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const normalizeProdutoCodigo = (value: unknown) => String(value || '').replace(/\D/g, '')

const clearProdutoLookupTimer = (index: number) => {
  const timer = produtoLookupTimers.get(index)
  if (timer) {
    clearTimeout(timer)
    produtoLookupTimers.delete(index)
  }
}

const setProdutoLookupLoading = (index: number, value: boolean) => {
  loadingProdutoEstoque.value[index] = value
}

const setProdutoLookupError = (index: number, value = '') => {
  if (value) {
    produtoEstoqueError.value[index] = value
  }
  else {
    delete produtoEstoqueError.value[index]
  }
}

const aplicarProdutoEstoque = (index: number, produtoEstoque: EstoqueProduto) => {
  const produto = editDraft.value.produtos?.[index]
  if (!produto) return

  produto.nome = produtoEstoque.descricao
  produto.id_produto_estoque = produtoEstoque.id_produto
  produto.embalagem = produtoEstoque.embalagem_saida || ''
  produto.tipo_produto = produtoEstoque.tipo_produto || null
  produto.confidence = 1
}

const buscarProdutoEstoquePorCodigo = async (index: number, codigo: string) => {
  const idProduto = Number(codigo)
  if (!Number.isFinite(idProduto) || idProduto <= 0) {
    return
  }

  const requestId = ++produtoLookupSeq
  produtoLookupRequestIds.value[index] = requestId
  setProdutoLookupLoading(index, true)
  setProdutoLookupError(index)

  try {
    const produtoEstoque = await estoqueStore.fetchProduto(idProduto)
    if (produtoLookupRequestIds.value[index] !== requestId) return

    if (produtoEstoque) {
      aplicarProdutoEstoque(index, produtoEstoque)
      return
    }

    setProdutoLookupError(index, 'Produto nao encontrado no estoque.')
  }
  catch {
    if (produtoLookupRequestIds.value[index] !== requestId) return
    setProdutoLookupError(index, 'Nao foi possivel buscar o produto.')
  }
  finally {
    if (produtoLookupRequestIds.value[index] === requestId) {
      setProdutoLookupLoading(index, false)
    }
  }
}

const agendarBuscaProdutoEstoque = (index: number, codigo: string) => {
  clearProdutoLookupTimer(index)

  if (!codigo) {
    setProdutoLookupLoading(index, false)
    setProdutoLookupError(index)
    return
  }

  const timer = setTimeout(() => {
    buscarProdutoEstoquePorCodigo(index, codigo)
  }, 260)

  produtoLookupTimers.set(index, timer)
}

const formatQuantity = (value: unknown) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(toNumber(value))
}

const formatCurrency = (value: unknown) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(toNumber(value))
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR')
}

const formatDate = (value?: string) => {
  const raw = String(value || '').slice(0, 10)
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR')
}

const produtos = computed(() => Array.isArray(props.nota?.produtos) ? props.nota!.produtos : [])

const stats = computed(() => {
  const totalComprado = produtos.value.reduce((acc, p) => acc + toNumber(p.quantidade), 0)
  const totalRetirado = produtos.value.reduce((acc, p) => acc + toNumber(p.quantidade_retirada), 0)

  return {
    totalItens: produtos.value.length,
    totalComprado,
    totalRetirado,
    saldoPendente: Math.max(0, totalComprado - totalRetirado),
    valorTotal: props.nota?.valor_total || 0,
  }
})

const retiradaPercent = computed(() => {
  if (stats.value.totalComprado <= 0) return 0
  return Math.min(100, Math.round((stats.value.totalRetirado / stats.value.totalComprado) * 100))
})

const historico = computed(() => {
  const raw = Array.isArray(props.nota?.historico_retiradas) ? props.nota!.historico_retiradas : []
  return [...raw].sort((a, b) => new Date(b.data || '').getTime() - new Date(a.data || '').getTime())
})

const podeEfetuarRetirada = computed(() => {
  const status = String(props.nota?.status_retirada || '').trim().toLowerCase()
  return status === 'pendente' || status === 'parcial'
})

const getProdutoNome = (index: number) => {
  return props.nota?.produtos?.[index]?.nome || 'Produto'
}

const irParaRetirada = () => {
  if (props.nota?.id) {
    router.push(notaRetiradaRoute(props.nota.id))
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

watch(editMode, value => emit('edit-mode-change', value))

const iniciarEdicao = () => {
  if (!props.isAdmin) return
  editMode.value = true
}

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

const atualizarProdutoNome = (index: number, value: string) => {
  const produto = editDraft.value.produtos?.[index]
  if (!produto) return

  produto.nome = value

  const codigo = normalizeProdutoCodigo(value)
  if (codigo && codigo === value.trim()) {
    produto.id_produto_estoque = Number(codigo)
    agendarBuscaProdutoEstoque(index, codigo)
  }
}

const atualizarIdProdutoEstoque = (index: number, value: string) => {
  const produto = editDraft.value.produtos?.[index]
  if (!produto) return

  const codigo = normalizeProdutoCodigo(value)
  produto.id_produto_estoque = codigo ? Number(codigo) : null

  if (!codigo) {
    produto.confidence = undefined
  }

  agendarBuscaProdutoEstoque(index, codigo)
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
      id_produto_estoque: item.id_produto_estoque ? toNumber(item.id_produto_estoque) : null,
    })).filter(item => item.nome || item.id_produto_estoque),
  }

  emit('save-edit', payload)
  editMode.value = false
}

defineExpose({
  iniciarEdicao,
  cancelarEdicao,
  salvarEdicao,
  editMode,
})

onBeforeUnmount(() => {
  for (const timer of produtoLookupTimers.values()) {
    clearTimeout(timer)
  }
})
</script>

<template>
  <div v-if="nota" class="text-slate-700 dark:text-slate-300">
    <div class="space-y-5">
      <Card padding-class="p-4 md:p-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Resumo da nota
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <h3 class="text-xl font-bold text-slate-950 dark:text-white">
                {{ nota.serie_nota || '1' }}-{{ nota.numero_nota }}
              </h3>
              <NotasStatusBadge :status="nota.status_retirada" />
              <NotasVendaFuturaBadge :data-prevista-retirada="nota.data_prevista_retirada" />
            </div>
          </div>

          <div class="grid min-w-0 grid-cols-2 gap-5 text-sm sm:text-right">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Itens</p>
              <p class="mt-1 text-base font-bold text-slate-950 dark:text-white">{{ stats.totalItens }}</p>
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Valor</p>
              <p class="mt-1 break-words text-base font-bold text-slate-950 dark:text-white">{{ formatCurrency(stats.valorTotal) }}</p>
            </div>
          </div>
        </div>

        <div class="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h4 class="text-sm font-bold text-slate-950 dark:text-white">Andamento da retirada</h4>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {{ formatQuantity(stats.totalRetirado) }} de {{ formatQuantity(stats.totalComprado) }} ja retirado.
                Ainda falta retirar {{ formatQuantity(stats.saldoPendente) }}.
              </p>
            </div>
            <span class="shrink-0 text-sm font-bold text-slate-950 dark:text-white">{{ retiradaPercent }}%</span>
          </div>

          <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              class="h-full rounded-full bg-emerald-500 transition-all duration-300 dark:bg-emerald-400"
              :style="{ width: `${retiradaPercent}%` }"
            />
          </div>

          <dl class="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div class="min-w-0">
              <dt class="font-semibold uppercase tracking-wide text-slate-400">Comprado</dt>
              <dd class="mt-1 text-base font-bold text-slate-950 dark:text-white">{{ formatQuantity(stats.totalComprado) }}</dd>
              <p class="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">Total da nota.</p>
            </div>
            <div class="min-w-0">
              <dt class="font-semibold uppercase tracking-wide text-sky-500 dark:text-sky-300">A retirar</dt>
              <dd class="mt-1 text-base font-bold text-slate-950 dark:text-white">{{ formatQuantity(stats.saldoPendente) }}</dd>
              <p class="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">Ainda nao retirado.</p>
            </div>
            <div class="min-w-0">
              <dt class="font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-300">Retirado</dt>
              <dd class="mt-1 text-base font-bold text-slate-950 dark:text-white">{{ formatQuantity(stats.totalRetirado) }}</dd>
              <p class="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">Ja saiu do estoque.</p>
            </div>
          </dl>
        </div>

        <div class="mt-4 grid gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 md:grid-cols-2">
          <div>
            <div class="flex items-center gap-2 text-slate-400">
              <UserRound class="h-4 w-4" />
              <span class="text-[11px] font-semibold uppercase tracking-wide">Cliente</span>
            </div>

            <div v-if="!editMode" class="mt-3 space-y-1">
              <p class="truncate text-base font-bold text-slate-950 dark:text-white">
                {{ nota.nome_cliente || 'Cliente nao informado' }}
              </p>
              <p v-if="nota.telefone_cliente" class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Phone class="h-3.5 w-3.5" />
                {{ nota.telefone_cliente }}
              </p>
              <p v-if="nota.documento_cliente" class="text-xs text-slate-500 dark:text-slate-400">
                Documento: {{ nota.documento_cliente }}
              </p>
            </div>

            <div v-else class="mt-3 grid gap-3">
              <label class="space-y-1">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nome</span>
                <Input
                  v-model="editDraft.nome_cliente"
                  type="text"
                  class="font-semibold"
                />
              </label>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="space-y-1">
                  <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Telefone</span>
                  <Input
                    :model-value="editDraft.telefone_cliente || ''"
                    type="text"
                    @update:model-value="editDraft.telefone_cliente = $event"
                  />
                </label>
                <label class="space-y-1">
                  <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Documento</span>
                  <Input
                    :model-value="editDraft.documento_cliente || ''"
                    type="text"
                    @update:model-value="editDraft.documento_cliente = $event"
                  />
                </label>
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center gap-2 text-slate-400">
              <Calendar class="h-4 w-4" />
              <span class="text-[11px] font-semibold uppercase tracking-wide">Registro</span>
            </div>
            <dl class="mt-3 grid gap-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">Compra</dt>
                <dd class="font-semibold text-slate-950 dark:text-white">{{ formatDate(nota.data_compra) }}</dd>
              </div>
              <div v-if="nota.data_prevista_retirada" class="flex items-center justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">Retirada prevista</dt>
                <dd class="text-right font-semibold text-amber-700 dark:text-amber-300">{{ formatDate(nota.data_prevista_retirada) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">Criado em</dt>
                <dd class="text-right font-semibold text-slate-950 dark:text-white">{{ formatDateTime(nota.criado_em) }}</dd>
              </div>
              <div v-if="nota.cadastrado_por_nome" class="flex items-center justify-between gap-3">
                <dt class="text-slate-500 dark:text-slate-400">Por</dt>
                <dd class="text-right font-semibold text-slate-950 dark:text-white">{{ nota.cadastrado_por_nome }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 md:px-5">
          <div>
            <h4 class="text-sm font-bold text-slate-950 dark:text-white">
              Itens do pedido
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ editMode ? (editDraft.produtos?.length || 0) : produtos.length }} itens
            </p>
          </div>

          <Botao
            v-if="editMode"
            type="button"
            variant="secondary"
            size="sm"
            @click="adicionarProduto"
          >
            <Plus class="h-4 w-4" />
            Novo
          </Botao>
        </div>

        <div v-if="!editMode" class="space-y-2 p-4 md:p-5">
          <NotaItemCard
            v-for="(produto, index) in produtos"
            :key="index"
            :produto="produto"
          />

          <div v-if="!produtos.length" class="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Nenhum item cadastrado.
          </div>
        </div>

        <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
          <div
            v-for="(produto, index) in (editDraft.produtos || [])"
            :key="`edit-${index}`"
            class="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.6fr)_120px_120px_120px_40px] md:items-end md:px-5"
          >
            <label class="space-y-1">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Produto</span>
              <Input
                :model-value="String(produto.nome || '')"
                type="text"
                class="font-semibold"
                @update:model-value="atualizarProdutoNome(index, $event)"
              />
              <p v-if="loadingProdutoEstoque[index]" class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Buscando produto...
              </p>
              <p v-else-if="produtoEstoqueError[index]" class="text-[11px] font-medium text-rose-600 dark:text-rose-300">
                {{ produtoEstoqueError[index] }}
              </p>
              <p v-else-if="produto.id_produto_estoque" class="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                Vinculado ao estoque: #{{ produto.id_produto_estoque }}
                <span v-if="produto.tipo_produto"> - {{ produto.tipo_produto }}</span>
                <span v-if="produto.embalagem"> - {{ produto.embalagem }}</span>
              </p>
            </label>
            <label class="space-y-1">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Qtd</span>
              <Input
                :model-value="String(produto.quantidade ?? '')"
                type="number"
                step="0.01"
                @update:model-value="produto.quantidade = toNumber($event)"
              />
            </label>
            <label class="space-y-1">
                  <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Retirado</span>
              <Input
                :model-value="String(produto.quantidade_retirada ?? '')"
                type="number"
                step="0.01"
                @update:model-value="produto.quantidade_retirada = toNumber($event)"
              />
            </label>
            <label class="space-y-1">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ID estoque</span>
              <Input
                :model-value="String(produto.id_produto_estoque ?? '')"
                inputmode="numeric"
                @update:model-value="atualizarIdProdutoEstoque(index, $event)"
              />
            </label>
            <IconButton
              type="button"
              label="Remover item"
              variant="danger"
              class="w-full md:w-10"
              @click="removerProduto(index)"
            >
              <Trash2 class="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </section>

      <section class="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:p-5">
          <div class="flex items-center gap-2 text-slate-400">
            <Camera class="h-4 w-4" />
            <h4 class="text-[11px] font-semibold uppercase tracking-wide">Evidencia fiscal</h4>
          </div>

          <CardButton
            v-if="nota.foto_url"
            type="button"
            class="group mt-3 block aspect-[4/3] overflow-hidden p-0"
            @click="previewImage = nota.foto_url"
          >
            <img :src="nota.foto_url" alt="Foto da nota" class="h-full w-full object-cover transition duration-200 group-hover:opacity-85">
          </CardButton>

          <div v-else-if="nota.midia_status === 'processando'" class="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-4 py-8 text-center text-sm font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            Foto sendo processada…
          </div>

          <div v-else-if="nota.midia_status === 'erro'" class="mt-3 rounded-lg border border-dashed border-rose-300 px-4 py-8 text-center text-sm font-medium text-rose-600 dark:border-rose-500/30 dark:text-rose-400">
            Falha ao processar a foto. Tente editar a nota e reenviar.
          </div>

          <div v-else class="mt-3 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Nenhuma foto anexada.
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:p-5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-slate-400">
              <ClipboardList class="h-4 w-4" />
              <h4 class="text-[11px] font-semibold uppercase tracking-wide">Historico</h4>
            </div>
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ historico.length }} eventos</span>
          </div>

          <div v-if="historico.length" class="mt-3 border-l border-slate-200 dark:border-slate-800">
            <NotaLogCard
              v-for="(item, index) in historico"
              :key="index"
              :item="item"
              :format-date-time="formatDateTime"
              :get-produto-nome="getProdutoNome"
              @preview="(url) => previewImage = url"
            />
          </div>

          <div v-else class="mt-3 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Nenhum evento registrado.
          </div>
        </div>
      </section>
    </div>

    <div v-if="props.showRetiradaAction && podeEfetuarRetirada" class="sticky bottom-0 mt-6 border-t border-slate-100 bg-white/95 pb-5 pt-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <Botao
        variant="primary"
        class="w-full !shadow-none hover:!shadow-none"
        @click="irParaRetirada"
      >
        Efetuar retirada
        <ArrowRight class="ml-2 h-4 w-4" />
      </Botao>
    </div>
  </div>

  <div v-else class="flex flex-col items-center justify-center py-12 text-center opacity-70">
    <Info class="h-6 w-6 text-slate-400" />
    <p class="mt-2 text-xs font-medium uppercase text-slate-500">Selecione uma nota</p>
  </div>

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
          <IconButton
            type="button"
            label="Fechar preview"
            class="absolute right-4 top-4 z-10 bg-black/50 text-white hover:bg-black/75"
            @click="previewImage = null"
          >
            <X class="h-4 w-4" />
          </IconButton>

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
