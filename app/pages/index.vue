<script setup lang="ts">
import AppPageShell from '../components/layout/AppPageShell.vue'
import IndexMetricasGerais from '../components/index/IndexMetricasGerais.vue'
</script>

<template>
  <AppPageShell
    eyebrow="Dashboard"
    title="Resumo geral das notas"
    description="Acompanhe volume, valores e andamento das retiradas em um único painel operacional."
  >
    <div class="space-y-8">
      <IndexMetricasGerais />
    </div>
  </AppPageShell>
</template>