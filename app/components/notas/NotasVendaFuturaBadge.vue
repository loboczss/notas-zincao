<script setup lang="ts">
import { computed } from 'vue'
import { CalendarClock } from 'lucide-vue-next'

const props = defineProps<{
  dataPrevistaRetirada?: string | null
}>()

const formatDate = (value?: string | null) => {
  const raw = String(value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ''

  const [year, month, day] = raw.split('-')
  return `${day}/${month}/${year}`
}

const label = computed(() => {
  const formatted = formatDate(props.dataPrevistaRetirada)
  return formatted ? `Venda futura: ${formatted}` : 'Venda futura'
})
</script>

<template>
  <span
    v-if="props.dataPrevistaRetirada"
    class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
    :title="label"
  >
    <CalendarClock class="h-3.5 w-3.5" />
    {{ label }}
  </span>
</template>
