<script setup lang="ts">
import { ClipboardList } from 'lucide-vue-next'

defineProps<{
  item: any
  formatDateTime: (value?: string) => string
  getProdutoNome: (index: number) => string
}>()

const emit = defineEmits<{
  (e: 'preview', url: string): void
}>()
</script>

<template>
  <div class="relative pb-4 pl-4 font-sans last:pb-0">
    <div
      class="absolute left-0 top-1.5 h-2 w-2 rounded-full"
      :class="item.itens_retirados?.length ? 'bg-emerald-500' : 'bg-slate-400'"
    />

    <div class="min-w-0">
      <p class="text-sm font-bold text-slate-950 dark:text-white">
        {{ item.itens_retirados?.length ? 'Retirada registrada' : 'Dados alterados' }}
      </p>
      <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {{ formatDateTime(item.data) }} por {{ item.responsavel_nome || 'Sistema' }}
      </p>

      <div v-if="item.itens_retirados?.length" class="mt-2 space-y-1">
        <div
          v-for="(it, itIdx) in item.itens_retirados"
          :key="itIdx"
          class="flex items-center justify-between gap-3 text-xs"
        >
          <span class="truncate text-slate-600 dark:text-slate-400">
            {{ getProdutoNome(it.index) }}
          </span>
          <span class="font-semibold text-slate-950 dark:text-white">
            {{ it.quantidade }}
          </span>
        </div>
      </div>

      <div v-if="item.fotos?.length" class="mt-2 flex gap-2 overflow-x-auto">
        <button
          v-for="(foto, fIdx) in item.fotos"
          :key="fIdx"
          type="button"
          class="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800"
          @click="emit('preview', foto)"
        >
          <img :src="foto" alt="Foto da retirada" class="h-full w-full object-cover">
        </button>
      </div>

      <div v-if="item.observacoes" class="mt-2 flex items-start gap-1.5 text-xs italic text-slate-500 dark:text-slate-400">
        <ClipboardList class="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{{ item.observacoes }}</span>
      </div>
    </div>
  </div>
</template>
