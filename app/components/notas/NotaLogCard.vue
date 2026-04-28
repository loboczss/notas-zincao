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
  <div class="relative pb-4 last:pb-0 font-sans">
    <div class="absolute -left-[17px] top-1 flex h-2 w-2 items-center justify-center rounded-full bg-emerald-500" />
    
    <div class="space-y-1">
      <span class="block text-[10px] font-medium text-slate-400">{{ formatDateTime(item.data) }}</span>
      <p class="text-xs font-semibold text-slate-900 dark:text-white">Retirada Efetuada</p>
      
      <div class="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-950">
        <p class="text-[10px] text-slate-500 font-medium">Por: {{ item.responsavel_nome || 'Sistema' }}</p>
        
        <!-- Itens Retirados -->
        <div v-if="item.itens_retirados?.length" class="mt-1.5 space-y-1 border-t border-slate-200 dark:border-slate-800 pt-1">
          <div 
            v-for="(it, itIdx) in item.itens_retirados" 
            :key="itIdx"
            class="flex items-center justify-between text-[10px]"
          >
            <span class="truncate text-slate-600 dark:text-slate-400 mr-2">
              {{ getProdutoNome(it.index) }}
            </span>
            <span class="font-semibold text-brand-600 dark:text-brand-400">
              {{ it.quantidade }}
            </span>
          </div>
        </div>

        <!-- Miniaturas -->
        <div v-if="item.fotos?.length" class="mt-2 flex gap-1 overflow-x-auto">
          <div 
            v-for="(foto, fIdx) in item.fotos" 
            :key="fIdx"
            class="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-200 dark:border-slate-800"
            @click="emit('preview', foto)"
          >
            <img :src="foto" class="h-full w-full object-cover">
          </div>
        </div>

        <div v-if="item.observacoes" class="mt-1.5 border-t border-slate-200 dark:border-slate-800 pt-1 text-[10px] text-slate-500 italic flex items-start gap-1">
          <ClipboardList class="h-3 w-3 shrink-0 mt-0.5" />
          <span>{{ item.observacoes }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
