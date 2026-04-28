<script setup lang="ts">
import { FileSearch } from 'lucide-vue-next'
</script>

<template>
  <div class="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <FileSearch class="h-6 w-6" />
    </div>

    <h3 class="text-sm font-medium text-slate-900 dark:text-white">
      Nenhuma nota encontrada
    </h3>
    <p class="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
      Não encontramos registros para os filtros selecionados. Tente ajustar sua busca ou limpar os filtros.
    </p>
  </div>
</template>
