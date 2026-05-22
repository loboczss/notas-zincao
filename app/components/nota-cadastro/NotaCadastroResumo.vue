<script setup lang="ts">
import type { NotaRetiradaListItem } from '../../../shared/types/NotasRetirada'
import Botao from '../Botao.vue'
import Card from '../Card.vue'

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
  <Card>
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Validação</p>
    <h2 class="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Salvar nota</h2>

    <div v-if="props.duplicateNota" class="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900/50 dark:bg-brand-500/10 dark:text-brand-200">
      Duplicidade encontrada: nota {{ props.duplicateNota.serie_nota }}-{{ props.duplicateNota.numero_nota }} já cadastrada para {{ props.duplicateNota.nome_cliente }}.
    </div>

    <div class="mt-4 flex justify-end">
      <Botao :disabled="props.loading || !!props.duplicateNota" @click="emit('save')">
        {{ props.loading ? 'Salvando...' : 'Salvar nota' }}
      </Botao>
    </div>
  </Card>
</template>
