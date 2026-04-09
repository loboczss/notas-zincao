<script setup lang="ts">
import type { NotaRetiradaListItem } from '../../../shared/types/NotasRetirada'
import Botao from '../Botao.vue'

const props = withDefaults(defineProps<{
  duplicateNota: NotaRetiradaListItem | null
  loading?: boolean
  errorMessage?: string
}>(), {
  loading: false,
  errorMessage: '',
})

const emit = defineEmits<{
  (e: 'save'): void
}>()
</script>

<template>
  <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Validacao</p>
    <h2 class="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Salvar nota</h2>

    <div v-if="props.duplicateNota" class="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900/50 dark:bg-brand-500/10 dark:text-brand-200">
      Duplicidade encontrada: nota {{ props.duplicateNota.serie_nota }}-{{ props.duplicateNota.numero_nota }} ja cadastrada para {{ props.duplicateNota.nome_cliente }}.
    </div>

    <div v-if="props.errorMessage" class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-500/10 dark:text-rose-300">
      {{ props.errorMessage }}
    </div>

    <div class="mt-5 flex justify-end">
      <Botao :disabled="props.loading || !!props.duplicateNota" @click="emit('save')">
        {{ props.loading ? 'Salvando...' : 'Salvar nota' }}
      </Botao>
    </div>
  </section>
</template>
