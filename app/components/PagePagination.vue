<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    page: number
    totalPages: number
    totalItems: number
    pageSize: number
    pageSizeOptions?: number[]
    label?: string
    loading?: boolean
  }>(),
  {
    pageSizeOptions: () => [20, 50, 100],
    label: 'itens',
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'update:pageSize', value: string): void
  (e: 'previous'): void
  (e: 'next'): void
}>()
</script>

<template>
  <Card class="text-sm" padding-class="px-4 py-3">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-slate-600 dark:text-slate-300">
        Pagina {{ props.page }} de {{ props.totalPages }} - {{ props.totalItems }} {{ props.label }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <SelectInput
          :model-value="String(props.pageSize)"
          size="sm"
          aria-label="Itens por pagina"
          @update:model-value="emit('update:pageSize', $event)"
        >
          <option
            v-for="option in props.pageSizeOptions"
            :key="option"
            :value="String(option)"
          >
            {{ option }} / pagina
          </option>
        </SelectInput>

        <Botao
          type="button"
          variant="secondary"
          size="sm"
          :disabled="props.loading || props.page <= 1"
          @click="emit('previous')"
        >
          Anterior
        </Botao>

        <Botao
          type="button"
          variant="secondary"
          size="sm"
          :disabled="props.loading || props.page >= props.totalPages"
          @click="emit('next')"
        >
          Proxima
        </Botao>
      </div>
    </div>
  </Card>
</template>
