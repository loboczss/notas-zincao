<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
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
  id_produto_pai: '',
  fator_conversao: '1',
})

const title = computed(() => form.id_produto ? `Editar produto #${form.id_produto}` : 'Novo produto do estoque')

const resetForm = () => {
  form.id_produto = props.initialValue?.id_produto
  form.descricao = String(props.initialValue?.descricao || '')
  form.embalagem_saida = String(props.initialValue?.embalagem_saida || '')
  form.valor_preco_varejo = String(props.initialValue?.valor_preco_varejo || '')
  form.tipo_produto = String(props.initialValue?.tipo_produto || '')
  form.quantidade_estoque = String(props.initialValue?.quantidade_estoque ?? 0)
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
    quantidade_estoque: form.quantidade_estoque,
    id_produto_pai: form.id_produto_pai === '' ? null : form.id_produto_pai,
    fator_conversao: form.fator_conversao === '' ? null : form.fator_conversao,
  })
}
</script>

<template>
  <ModalGlobal
    :model-value="props.modelValue"
    :title="title"
    max-width-class="max-w-3xl"
    content-class="p-5 md:p-6"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-6">
      <!-- Seção 1: Identificação -->
      <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/20">
        <h4 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Identificação e Categoria</h4>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Descrição do Produto</label>
            <Input v-model="form.descricao" placeholder="Ex: Cimento CP-II 50kg" />
            <span class="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">Nome completo que será exibido nas notas e relatórios.</span>
          </div>

          <div class="md:col-span-2">
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Tipo / Categoria</label>
            <Input v-model="form.tipo_produto" placeholder="Ex: Ferragens, Tintas, Hidráulica" />
            <span class="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">Facilita o agrupamento de produtos do mesmo setor.</span>
          </div>
        </div>
      </div>

      <!-- Seção 2: Unidades e Valores -->
      <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/20">
        <h4 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Estoque e Comercial</h4>
        <div class="grid gap-4 md:grid-cols-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Qtd. em Estoque</label>
            <Input v-model="form.quantidade_estoque" type="number" min="0" step="0.001" placeholder="0" />
            <span class="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">Volume físico atual.</span>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Embalagem (Saída)</label>
            <Input v-model="form.embalagem_saida" placeholder="Ex: UN, SACO, KG, M³" />
            <span class="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">Unidade de medida.</span>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Preço Varejo (R$)</label>
            <Input v-model="form.valor_preco_varejo" placeholder="Ex: 45.90" />
            <span class="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">Valor padrão de venda.</span>
          </div>
        </div>
      </div>

      <!-- Seção 3: Configurações Avançadas -->
      <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/20">
        <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Associação / Fracionamento</h4>
        <span class="mb-3 block text-[10px] text-slate-400 dark:text-slate-500">Preencha apenas se este produto for gerado a partir de outro maior (ex: vender por UN um item de CAIXA).</span>
        
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">ID do Produto Pai</label>
            <Input v-model="form.id_produto_pai" type="number" min="1" step="1" placeholder="Opcional" />
            <span class="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">ID do produto que dá origem a este.</span>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Fator de Conversão</label>
            <Input v-model="form.fator_conversao" type="number" min="0.001" step="0.001" placeholder="1" />
            <span class="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">Qtd. gerada de filhos para cada 1 unidade do pai.</span>
          </div>
        </div>
      </div>
    </div>

    <p v-if="props.errorMessage" class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
      {{ props.errorMessage }}
    </p>

    <template #footer>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Botao variant="secondary" :disabled="props.loading" @click="close">
          Cancelar
        </Botao>
        <Botao :disabled="props.loading" @click="submit">
          {{ props.loading ? 'Salvando...' : 'Salvar produto' }}
        </Botao>
      </div>
    </template>
  </ModalGlobal>
</template>
