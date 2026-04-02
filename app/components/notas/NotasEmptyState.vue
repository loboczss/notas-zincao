<script setup lang="ts">
import { FileSearch } from 'lucide-vue-next'
</script>

<template>
  <div class="glass flex min-h-[300px] flex-col items-center justify-center rounded-[40px] border p-12 text-center transition-all duration-500 dark:border-white/5">
    <div class="relative mb-6">
      <div class="absolute inset-0 animate-pulse rounded-3xl bg-brand-500/10 blur-xl" />
      <div class="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-brand-500/20 bg-brand-500/5 text-brand-500 shadow-inner">
        <FileSearch class="h-10 w-10 stroke-[1.5]" />
      </div>
    </div>

    <h3 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
      Nenhuma nota encontrada
    </h3>
    <p class="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
      Não encontramos registros para os filtros selecionados. Tente ajustar sua busca ou limpar os filtros.
    </p>
  </div>
</template>
