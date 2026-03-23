<script setup lang="ts">
import NoteListTable from '../components/NoteList/NoteListTable.vue'
import AppPageShell from '../components/layout/AppPageShell.vue'
import Botao from '../components/Botao.vue'

definePageMeta({
  middleware: [
    () => {
      const session = useSupabaseSession()
      if (!session.value) return navigateTo('/login')
    }
  ],
})
</script>

<template>
  <AppPageShell 
    eyebrow="Relatórios" 
    title="Listagem de Notas" 
    description="Visualize and gerencie todas as notas fiscais cadastradas no sistema."
  >
    <template #headerAside>
      <Botao @click="navigateTo('/cadastrar-nota')">
        + Nova Nota
      </Botao>
    </template>

    <div class="mt-8">
      <NoteListTable />
    </div>
  </AppPageShell>
</template>
