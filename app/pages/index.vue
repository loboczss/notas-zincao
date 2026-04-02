<script setup lang="ts">
import AppPageShell from '../components/layout/AppPageShell.vue'
import IndexMetricasGerais from '../components/index/IndexMetricasGerais.vue'
</script>

<template>
  <AppPageShell
    eyebrow="Dashboard"
    title="Dashboard Operacional"
    description="Controle total de volume físico, status de notas e acompanhamento de entregas pendentes."
  >
    <div class="space-y-8">
      <IndexMetricasGerais />
    </div>
  </AppPageShell>
</template>