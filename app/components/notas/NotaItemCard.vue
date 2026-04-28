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

const progresso = computed(() => {
  const total = toNumber(props.produto.quantidade)
  if (total <= 0) return 0
  return Math.min(100, Math.round((toNumber(props.produto.quantidade_retirada) / total) * 100))
})
</script>

<template>
  <div class="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 font-sans">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
          <Package class="h-4 w-4" />
        </div>
        <div>
          <p class="text-sm font-medium text-slate-900 dark:text-white">{{ produto.nome }}</p>
          <p class="text-xs text-slate-400">ID: {{ produto.id_produto_estoque }}</p>
        </div>
      </div>

      <div class="flex gap-4 text-right text-xs ml-auto sm:ml-0">
        <div>
          <p class="text-slate-400 font-medium">Qtd</p>
          <p class="font-semibold text-slate-900 dark:text-white">{{ toNumber(produto.quantidade) }}</p>
        </div>
        <div>
          <p class="text-slate-400 font-medium">Entregue</p>
          <p class="font-semibold text-emerald-600 dark:text-emerald-400">{{ toNumber(produto.quantidade_retirada) || 0 }}</p>
        </div>
        <div>
          <p class="text-slate-400 font-medium">Saldo</p>
          <p class="font-semibold text-brand-600 dark:text-brand-400">{{ saldo }}</p>
        </div>
      </div>
    </div>

    <div class="mt-2 flex items-center gap-2">
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div 
          class="h-full rounded-full transition-all duration-500"
          :class="toNumber(produto.quantidade_retirada) >= toNumber(produto.quantidade) ? 'bg-emerald-500' : 'bg-brand-500'"
          :style="{ width: `${progresso}%` }"
        />
      </div>
      <span class="text-[10px] font-medium w-8 text-right" :class="toNumber(produto.quantidade_retirada) >= toNumber(produto.quantidade) ? 'text-emerald-600' : 'text-brand-600'">
        {{ progresso }}%
      </span>
    </div>
  </div>
</template>
