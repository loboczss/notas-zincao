<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Boxes, Link2, Package, Plus } from 'lucide-vue-next'
import Botao from '../Botao.vue'
import Input from '../Input.vue'
import type { EstoqueProdutoDraft } from '../../../shared/types/Estoque'

type EstoqueProdutoFormState = {
  id_produto?: number
  descricao: string
  embalagem_saida: string
  valor_preco_varejo: string
  tipo_produto: string
  quantidade_estoque: string
  adicao_estoque: string
  id_produto_pai: string
  fator_conversao: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  initialValue?: Partial<EstoqueProdutoDraft> | null
  loading?: boolean
  errorMessage?: string
}>(), {
  initialValue: null,
  loading: false,
  errorMessage: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', payload: EstoqueProdutoDraft): void
}>()

const form = reactive<EstoqueProdutoFormState>({
  id_produto: undefined,
  descricao: '',
  embalagem_saida: '',
  valor_preco_varejo: '',
  tipo_produto: '',
  quantidade_estoque: '0',
  adicao_estoque: '',
  id_produto_pai: '',
  fator_conversao: '1',
})

const title = computed(() => form.id_produto ? `Produto #${form.id_produto}` : 'Novo produto')

const toDecimal = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace(',', '.').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const quantidadeBase = computed(() => Math.max(0, toDecimal(form.quantidade_estoque)))
const quantidadeAdicionada = computed(() => Math.max(0, toDecimal(form.adicao_estoque)))
const podeAdicionar = computed(() => Boolean(form.id_produto) && quantidadeAdicionada.value > 0)

const aplicarAdicao = () => {
  if (!podeAdicionar.value) return
  const novoTotal = Number((quantidadeBase.value + quantidadeAdicionada.value).toFixed(3))
  form.quantidade_estoque = String(novoTotal)
  form.adicao_estoque = ''
}

const resetForm = () => {
  form.id_produto = props.initialValue?.id_produto
  form.descricao = String(props.initialValue?.descricao || '')
  form.embalagem_saida = String(props.initialValue?.embalagem_saida || '')
  form.valor_preco_varejo = String(props.initialValue?.valor_preco_varejo || '')
  form.tipo_produto = String(props.initialValue?.tipo_produto || '')
  form.quantidade_estoque = String(props.initialValue?.quantidade_estoque ?? 0)
  form.adicao_estoque = ''
  form.id_produto_pai = props.initialValue?.id_produto_pai == null ? '' : String(props.initialValue.id_produto_pai)
  form.fator_conversao = String(props.initialValue?.fator_conversao ?? 1)
}

watch(() => props.modelValue, (opened) => {
  if (opened) {
    resetForm()
  }
}, { immediate: true })

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  emit('save', {
    id_produto: form.id_produto,
    descricao: String(form.descricao || '').trim(),
    embalagem_saida: String(form.embalagem_saida || '').trim(),
    valor_preco_varejo: String(form.valor_preco_varejo || '').trim() || null,
    tipo_produto: String(form.tipo_produto || '').trim() || null,
    quantidade_estoque: String(Number(quantidadeBase.value.toFixed(3))),
    id_produto_pai: form.id_produto_pai === '' ? null : form.id_produto_pai,
    fator_conversao: form.fator_conversao === '' ? null : form.fator_conversao,
  })
}
</script>

<template>
  <ModalGlobal
    :model-value="props.modelValue"
    :title="title"
    max-width-class="max-w-2xl"
    content-class="p-0"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="divide-y divide-slate-100 dark:divide-slate-800">
      <section class="p-4 md:p-5">
        <div class="mb-3 flex items-center gap-2 text-slate-400">
          <Package class="h-4 w-4" />
          <h3 class="text-[11px] font-semibold uppercase">Produto</h3>
        </div>

        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <label class="space-y-1">
            <span class="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Descrição</span>
            <Input v-model="form.descricao" size="sm" placeholder="Nome do produto" />
          </label>

          <label class="space-y-1">
            <span class="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Tipo</span>
            <Input v-model="form.tipo_produto" size="sm" placeholder="Categoria" />
          </label>
        </div>
      </section>

      <section class="p-4 md:p-5">
        <div class="mb-3 flex items-center gap-2 text-slate-400">
          <Boxes class="h-4 w-4" />
          <h3 class="text-[11px] font-semibold uppercase">Estoque</h3>
        </div>

        <div
          class="grid gap-3"
          :class="form.id_produto ? 'sm:grid-cols-2 md:grid-cols-4' : 'sm:grid-cols-3'"
        >
          <label class="space-y-1">
            <span class="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Quantidade</span>
            <Input v-model="form.quantidade_estoque" size="sm" type="number" min="0" step="0.001" inputmode="decimal" placeholder="0" />
          </label>

          <label v-if="form.id_produto" class="space-y-1">
            <span class="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Adicionar</span>
            <div class="flex gap-1">
              <Input
                v-model="form.adicao_estoque"
                size="sm"
                type="number"
                min="0"
                step="0.001"
                inputmode="decimal"
                placeholder="+0"
                @keydown.enter.prevent="aplicarAdicao"
              />
              <IconButton
                label="Somar ao estoque"
                size="sm"
                variant="primary"
                :disabled="!podeAdicionar"
                @click="aplicarAdicao"
              >
                <Plus class="h-4 w-4" />
              </IconButton>
            </div>
          </label>

          <label class="space-y-1">
            <span class="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Embalagem</span>
            <Input v-model="form.embalagem_saida" size="sm" placeholder="UN, KG, M" />
          </label>

          <label class="space-y-1">
            <span class="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Preço</span>
            <Input v-model="form.valor_preco_varejo" size="sm" inputmode="decimal" placeholder="0,00" />
          </label>
        </div>
      </section>

      <section class="p-4 md:p-5">
        <div class="mb-3 flex items-center gap-2 text-slate-400">
          <Link2 class="h-4 w-4" />
          <h3 class="text-[11px] font-semibold uppercase">Vínculo</h3>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="space-y-1">
            <span class="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Produto pai</span>
            <Input v-model="form.id_produto_pai" size="sm" type="number" min="1" step="1" placeholder="Opcional" />
          </label>

          <label class="space-y-1">
            <span class="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Fator</span>
            <Input v-model="form.fator_conversao" size="sm" type="number" min="0.001" step="0.001" placeholder="1" />
          </label>
        </div>
      </section>

      <p v-if="props.errorMessage" class="px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300 md:px-5">
        {{ props.errorMessage }}
      </p>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variant="secondary" :disabled="props.loading" class="w-full sm:w-auto" @click="close">
          Cancelar
        </Botao>
        <Botao :disabled="props.loading" class="w-full sm:w-auto" @click="submit">
          {{ props.loading ? 'Salvando...' : 'Salvar' }}
        </Botao>
      </div>
    </template>
  </ModalGlobal>
</template>
