<script setup lang="ts">
import { CircleStop, RefreshCw } from 'lucide-vue-next'
import Botao from '../Botao.vue'

const props = withDefaults(defineProps<{
  isAdmin?: boolean
  syncInProgress?: boolean
  cancelling?: boolean
  loadingProdutos?: boolean
  refreshing?: boolean
}>(), {
  isAdmin: false,
  syncInProgress: false,
  cancelling: false,
  loadingProdutos: false,
  refreshing: false,
})

const emit = defineEmits<{
  (e: 'sync-now'): void
  (e: 'cancel-sync'): void
  (e: 'refresh'): void
}>()
</script>

<template>
  <div class="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
    <Botao
      v-if="props.isAdmin"
      type="button"
      variant="primary"
      class="min-h-12 justify-start px-3 py-2 sm:justify-center"
      :disabled="props.syncInProgress"
      title="Busca os saldos na Integrim e grava na base local."
      aria-label="Sincronizar: busca os saldos na Integrim e grava na base local."
      @click="emit('sync-now')"
    >
      <RefreshCw class="h-4 w-4" :class="props.syncInProgress ? 'animate-spin' : ''" />
      <span class="flex flex-col items-start leading-tight">
        <span>{{ props.syncInProgress ? 'Sincronizando' : 'Sincronizar' }}</span>
        <span class="text-[11px] font-medium opacity-80">Busca na Integrim</span>
      </span>
    </Botao>

    <Botao
      v-if="props.isAdmin && props.syncInProgress"
      type="button"
      variant="danger"
      class="min-h-12 justify-start border border-rose-200 bg-rose-50 px-3 py-2 sm:justify-center dark:border-rose-900/60 dark:bg-rose-500/10"
      :disabled="props.cancelling"
      title="Solicita parada da sincronizacao no proximo lote seguro."
      aria-label="Parar sincronizacao no proximo lote seguro."
      @click="emit('cancel-sync')"
    >
      <CircleStop class="h-4 w-4" :class="props.cancelling ? 'animate-pulse' : ''" />
      <span class="flex flex-col items-start leading-tight">
        <span>{{ props.cancelling ? 'Parando' : 'Parar' }}</span>
        <span class="text-[11px] font-medium opacity-80">No lote seguro</span>
      </span>
    </Botao>

    <Botao
      type="button"
      variant="secondary"
      class="min-h-12 justify-start px-3 py-2 sm:justify-center"
      :disabled="props.loadingProdutos"
      title="Recarrega a lista usando os dados ja salvos."
      aria-label="Atualizar: recarrega a lista usando os dados ja salvos."
      @click="emit('refresh')"
    >
      <RefreshCw class="h-4 w-4" :class="props.refreshing ? 'animate-spin' : ''" />
      <span class="flex flex-col items-start leading-tight">
        <span>Atualizar</span>
        <span class="text-[11px] font-medium opacity-70">Recarrega a lista</span>
      </span>
    </Botao>
  </div>
</template>
