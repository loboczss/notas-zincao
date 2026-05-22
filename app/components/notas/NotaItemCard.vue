<script setup lang="ts">
import { computed } from 'vue'
import { Package } from 'lucide-vue-next'
import type { NotaProduto } from '../../../shared/types/NotasRetirada'

const props = defineProps<{
  produto: NotaProduto
}>()

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const saldo = computed(() => {
  const comprado = Math.max(0, toNumber(props.produto.quantidade))
  const retirado = Math.max(0, toNumber(props.produto.quantidade_retirada))
  return Math.max(0, comprado - retirado)
})

const formatQuantity = (value: unknown) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(toNumber(value))
}
</script>

<template>
  <div class="rounded-lg border border-slate-100 bg-slate-50/50 p-3 font-sans dark:border-slate-800 dark:bg-slate-950/30">
    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(190px,240px)] md:items-center">
      <div class="flex min-w-0 items-start gap-3">
        <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <Package class="h-4 w-4" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-bold text-slate-950 dark:text-white">{{ produto.nome }}</p>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">ID: {{ produto.id_produto_estoque || '-' }}</p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3 text-right text-xs">
        <div>
          <p class="font-semibold uppercase tracking-wide text-slate-400">Qtd</p>
          <p class="mt-1 text-sm font-bold text-slate-950 dark:text-white">{{ formatQuantity(produto.quantidade) }}</p>
        </div>
        <div>
          <p class="font-semibold uppercase tracking-wide text-slate-400">Retirado</p>
          <p class="mt-1 text-sm font-bold text-slate-950 dark:text-white">{{ formatQuantity(produto.quantidade_retirada) }}</p>
        </div>
        <div>
          <p class="font-semibold uppercase tracking-wide text-slate-400">Saldo</p>
          <p class="mt-1 text-sm font-bold text-slate-950 dark:text-white">{{ formatQuantity(saldo) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
