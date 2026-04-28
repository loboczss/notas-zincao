<script setup lang="ts">
import { computed } from 'vue'
import { Pencil, Boxes } from 'lucide-vue-next'
import type { EstoqueProduto } from '../../../shared/types/Estoque'

const props = withDefaults(defineProps<{
  produto: EstoqueProduto
  canEdit?: boolean
}>(), {
  canEdit: false,
})

const emit = defineEmits<{
  (e: 'edit', idProduto: number): void
}>()

const quantidadeFormatada = computed(() => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(props.produto.quantidade_estoque || 0))
})
</script>

<template>
  <article class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
          Produto #{{ props.produto.id_produto }}
        </p>
        <h3 class="mt-1 text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {{ props.produto.descricao }}
        </h3>
      </div>

        <button
          v-if="props.canEdit"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          @click="emit('edit', props.produto.id_produto)"
        >
          <Pencil class="h-4 w-4" />
          Editar
        </button>
    </div>

    <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div>
        <dt class="text-slate-500 dark:text-slate-400">Tipo</dt>
        <dd class="font-medium text-slate-800 dark:text-slate-200">{{ props.produto.tipo_produto || '-' }}</dd>
      </div>
      <div>
        <dt class="text-slate-500 dark:text-slate-400">Embalagem</dt>
        <dd class="font-medium text-slate-800 dark:text-slate-200">{{ props.produto.embalagem_saida }}</dd>
      </div>
      <div class="col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
        <dt class="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Boxes class="h-4 w-4" />
          Quantidade em estoque
        </dt>
        <dd class="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">{{ quantidadeFormatada }}</dd>
      </div>
    </dl>
  </article>
</template>
