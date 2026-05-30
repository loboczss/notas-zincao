<script setup lang="ts">
import { computed } from 'vue'
import { Pencil } from 'lucide-vue-next'
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

const precoFormatado = computed(() => {
  const value = Number(String(props.produto.valor_preco_varejo || '').replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0) return null

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
})
</script>

<template>
  <article class="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-2">
          <span class="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            #{{ props.produto.id_produto }}
          </span>
          <h3 class="truncate text-sm font-bold text-slate-950 dark:text-slate-100">
            {{ props.produto.descricao }}
          </h3>
        </div>

        <div class="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span class="truncate">{{ props.produto.tipo_produto || 'Sem tipo' }}</span>
          <span class="text-slate-300 dark:text-slate-700">/</span>
          <span class="shrink-0">{{ props.produto.embalagem_saida || '-' }}</span>
          <template v-if="precoFormatado">
            <span class="text-slate-300 dark:text-slate-700">/</span>
            <span class="shrink-0">{{ precoFormatado }}</span>
          </template>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <div class="w-16 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-right dark:border-slate-800 dark:bg-slate-950">
          <p class="text-[9px] font-semibold uppercase leading-none text-slate-400">Qtd</p>
          <p class="mt-0.5 text-sm font-black tabular-nums text-slate-950 dark:text-white">
            {{ quantidadeFormatada }}
          </p>
        </div>

        <IconButton
          v-if="props.canEdit"
          label="Editar produto"
          @click="emit('edit', props.produto.id_produto)"
        >
          <Pencil class="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  </article>
</template>
