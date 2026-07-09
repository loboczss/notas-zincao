<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Settings2, ArrowRight } from 'lucide-vue-next'
import type {
  IntegrimCompraParametros,
  IntegrimCompraParametrosUpdateRequest,
} from '../../../../shared/types/IntegrimNotas'
import ModalGlobal from '../../ModalGlobal.vue'
import Input from '../../Input.vue'
import Botao from '../../Botao.vue'
import InfoTooltip from '../../InfoTooltip.vue'

const props = defineProps<{
  modelValue: boolean
  parametros: IntegrimCompraParametros | null
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', payload: IntegrimCompraParametrosUpdateRequest): void
}>()

const form = reactive({
  leadTime: '7',
  coverage: '30',
})

watch(
  () => props.parametros,
  (value) => {
    if (!value) return
    form.leadTime = String(value.lead_time_dias ?? 7)
    form.coverage = String(value.coverage_days ?? 30)
  },
  { immediate: true },
)

const fechar = () => emit('update:modelValue', false)

const salvar = () => {
  emit('save', {
    lead_time_dias: Math.max(0, Number(form.leadTime || 0)),
    coverage_days: Math.max(1, Number(form.coverage || 1)),
  })
}
</script>

<template>
  <ModalGlobal
    :model-value="props.modelValue"
    title="Ajustes da previsão"
    description="Parâmetros que definem quando e quanto comprar."
    max-width-class="max-w-md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="space-y-4 p-5">
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-1">
          <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Lead time (dias)</span>
          <InfoTooltip title="Lead time" text="Quantos dias o fornecedor leva para entregar depois do pedido. Entra no cálculo do ponto de reposição e do estoque de segurança." align="center" />
        </div>
        <Input v-model="form.leadTime" type="number" min="0" max="365" size="sm" class="text-sm" />
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-1">
          <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Cobertura (dias)</span>
          <InfoTooltip title="Dias de cobertura" text="Por quantos dias de venda a compra sugerida deve durar, além do lead time. Ex.: 30 = repor ~1 mês de demanda." align="center" />
        </div>
        <Input v-model="form.coverage" type="number" min="1" max="365" size="sm" class="text-sm" />
      </div>

      <NuxtLink
        to="/previsao-compras/config"
        class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800/60"
        @click="fechar"
      >
        <span class="flex items-center gap-2">
          <Settings2 class="h-4 w-4" />
          Sincronização e agenda (avançado)
        </span>
        <ArrowRight class="h-4 w-4" />
      </NuxtLink>

      <div class="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Botao type="button" variant="secondary" class="text-xs" @click="fechar">Cancelar</Botao>
        <Botao type="button" variant="accent" class="text-xs" :disabled="props.saving" @click="salvar">
          {{ props.saving ? 'Salvando…' : 'Salvar' }}
        </Botao>
      </div>
    </div>
  </ModalGlobal>
</template>
