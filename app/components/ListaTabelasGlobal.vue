<script setup lang="ts">
type Column = {
  key: string
  label: string
}

const props = withDefaults(
  defineProps<{
    columns: Column[]
    rows: Record<string, string | number | null>[]
    emptyText?: string
  }>(),
  {
    emptyText: 'Nenhum item encontrado.',
  },
)
</script>

<template>
  <div>
    <div class="space-y-3 md:hidden">
      <article
        v-for="(row, index) in props.rows"
        :key="index"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div class="space-y-2">
          <div v-for="column in props.columns" :key="`${column.key}-${index}`" class="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ column.label }}</span>
            <span class="text-right text-sm text-slate-700">{{ row[column.key] ?? '-' }}</span>
          </div>
        </div>
      </article>
      <div v-if="props.rows.length === 0" class="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        {{ props.emptyText }}
      </div>
    </div>

    <div class="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
      <table class="min-w-full divide-y divide-slate-200 bg-white">
        <thead class="bg-slate-50">
          <tr>
            <th
              v-for="column in props.columns"
              :key="column.key"
              class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100">
          <tr v-if="props.rows.length === 0">
            <td :colspan="props.columns.length" class="px-4 py-6 text-center text-sm text-slate-500">
              {{ props.emptyText }}
            </td>
          </tr>

          <tr v-for="(row, index) in props.rows" v-else :key="index">
            <td
              v-for="column in props.columns"
              :key="`${column.key}-${index}`"
              class="px-4 py-3 text-sm text-slate-700"
            >
              {{ row[column.key] ?? '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
